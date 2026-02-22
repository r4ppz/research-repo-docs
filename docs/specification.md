# Architecture & Implementation Spec

---

## High-level Summary

The **Purpose** of the system is to serve as a gated school research repository where students can browse paper metadata, request access to full documents, and where admins manage papers and requests.

**Authentication** is handled through Google SSO restricted to `@acdeducation.com`.

**Authorization** uses access tokens (`JWT`) with role-based access (`STUDENT`, `TEACHER`, `DEPARTMENT_ADMIN`, `SUPER_ADMIN`). Department scoping for `DEPARTMENT_ADMIN` applies only to admin operations (paper CRUD, request approvals); homepage browsing shows all departments.

- **File access**:
    - Students and Teachers: only if their request is `ACCEPTED` **and** the paper is not archived. Archived papers
      are treated as unavailable and should result in `HTTP 404`.
    - Admins: full access within their department (`DEPARTMENT_ADMIN`) or globally (`SUPER_ADMIN`).

- **Archive feature**:
    - Papers can be archived/unarchived by admins.
    - Archived papers are hidden from students' library.
    - Archived papers are visible in teacher view (can see metadata but cannot request or download).
    - Students with previously `ACCEPTED` requests cannot download archived papers.

---

## Roles & Capabilities (AuthZ)

| Role             | Department | Can View Metadata                               | Can Download/View PDF                           | Can CRUD Papers             | Can Approve/Reject Requests                 |
| ---------------- | ---------- | ----------------------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| STUDENT          | null       | All non-archived papers, all departments        | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| TEACHER          | null       | All papers, including archived, all departments | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| DEPARTMENT_ADMIN | Required   | All papers, including archived, all departments | Full for their department                       | Full for their department   | Approve/reject requests in their department |
| SUPER_ADMIN      | null       | All papers, including archived, all departments | Full across all departments                     | Full across all departments | Full across all departments                 |

---

### Page Access (frontend)

- **STUDENT**
    - LibraryPage (non-archived papers, all departments)
    - RequestPage → Own requests

- **TEACHER**
    - LibraryPage (all papers metadata, all departments)
    - RequestPage → Own requests

- **DEPARTMENT_ADMIN**
    - LibraryPage (all papers metadata, all departments)
    - RequestPage → Request approvals (dept-scoped)
    - ResearchPage → Paper management (dept-scoped)

- **SUPER_ADMIN**
    - LibraryPage (all papers, all departments)
    - RequestPage → Request approvals (global)
    - ResearchPage → Paper management (global)

---

## Database Schema

For the full database design and migration, see the [Database](./database_migration.md).

---

## API Endpoints

For detailed API documentation including request/response schemas, error codes, and authorization
requirements, see the full [API Contract](./api_contract.md).

---

## File Storage Handling

PDF files are stored directly on the server's local filesystem using Docker bind. A host directory is mounted to the container to persist files across container restarts. Files are tied to the physical server; proper backup strategy is essential for disaster recovery (dont have a plan yet).

The `file_path` column stores only the relative file path rather than full API paths. The database does **not** store file binary but just the path. The complete URL is constructed dynamically in the DTO/Mapper layer.

---

## Data Privacy & Collection

The system handles authentication entirely via [Google OAuth 2.0](https://dev.to/yaswanth_bonumaddi/understanding-google-oauth-20-57fn), ensuring that the system **never** sees or stores user passwords. For **identity**, we store only the user's name, email, and Google profile picture URL from the Google Account that the user agreed to use (`@acdeducation.com`).

Academic data includes research metadata such as Title, Author, Abstract, and Department, along with the uploaded PDF/DOCX binary files.

## Authentication (AuthN)

- Frontend obtains **Google OAuth authorization code** via Google Identity Services.
- Backend exchanges the code for:
    - Access token (JWT) - short-lived (60 minutes), returned in JSON body.
    - Refresh token - long-lived (30 days), returned in `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/` cookie.
- Backend verifies the **Google ID token**:
    - Signature, Issuer, Audience, Expiry.
    - Domain enforced: must be `acdeducation.com`.
    - Extracts user profile data: `email`, `name`, `picture` (from `profile` OAuth scope).
- On first login, a new user record is created with:
    - Default role: `STUDENT`.
    - Profile picture URL from Google (extracted from ID token claims).
    - Profile picture is stored as a URL string (not binary) to minimize storage and leverage Google's CDN.

### Token Refresh Flow (Cookie-Based)

- When access token expires, frontend calls `/api/auth/refresh`.
- Browser automatically attaches the `refreshToken` cookie (no manual storage in React).
- Backend validates refresh token against database records (checks expiration).
- If a refresh token is used again (e.g., due to network issues), the server returns 401 Unauthorized and the client redirects to login.
- Backend generates new access token and new refresh token.
- **Rotation:** Old refresh token is revoked; new refresh token is sent via a new `Set-Cookie` header.
- New access token is returned in JSON body.
- **Note:** `/api/auth/refresh` is a public endpoint (no JWT required) but requires the `refreshToken` to be present in an `HttpOnly` cookie. Browsers attach the cookie automatically; the frontend must never attempt to read or store the refresh token directly.

### Logout Flow

- Frontend calls `/api/auth/logout`.
- Browser automatically attaches the `refreshToken` cookie.
- Backend finds the token in the database and deletes it (server-side revocation).
- Backend responds with a `Set-Cookie` header that overwrites the cookie with an immediate expiration (`Max-Age=0`), clearing it from the browser.
- **Note:** `/api/auth/logout` is also public (no JWT required) but requires the `refreshToken` cookie to locate and revoke the token server-side. The frontend must never attempt to read or store the refresh token directly.

### Access Token Structure (JWT)

- **Claims**: `sub` (userId), `email`, `fullName`, `role`, `departmentId`, `profilePictureUrl`, `iat`, `exp`, `iss`.
- Lifetime: 60 minutes.
- Backend uses `sub` for all RBAC/ABAC queries.

### Refresh Token

- Opaque, unique string stored in database.
- Lifetime: 30 days.
- **Transport:** Strictly `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/` cookie (never in JSON body).
- Primary security relies on expiration + rotation.

### Manual Role Assignment

Privileged roles (`TEACHER`, `SUPER_ADMIN`, `DEPARTMENT_ADMIN`) are managed on the backend using a configuration file.
When a user logs in via Google SSO, the system checks their email against this config file to determine their role and assigned department.
If not included or configured, the user is assigned the default `STUDENT` role.

The system does not handle sign-ups, only logins. So, in order to manage roles & permissions, this config file is needed.

Roles listed in this file can bypass the email restriction `@acdeducation.com`.
This is because we don't know if they even have a `@acdeducation.com` account like students do.

In production, this file will be secured on the server and only developers or admins will be able to modify it.
Any changes to the config file may require a service restart or a fresh login by the user.

We will eventually implement a full authentication system in the **future** that includes sign-up/registration and a UI/frontend way to manage roles & permissions instead of this config file.
But that's way too [complicated and unnecessary](https://auth0.com/blog/building-account-systems/#1--Ideally--Don-t); **for now**, this is enough for simplicity.

> If you worry about the security of how we manage roles & permissions, you can PR or issue for a better alternative through our [GitHub](https://github.com/r4ppz/research-repo-docs/issues). Note that making a _complete authentication system_ is beyond our current skillset.
