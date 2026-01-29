# Research Repository — Architecture & Implementation Spec

This spec is intentionally detailed. It is the **single source of truth** for backend and frontend data design, API contracts, and authorization logic. All changes must be documented here first, then implemented.

---

## High-level Summary

- **Purpose**: A gated school research repository where students can browse paper metadata, request access to full documents, and where admins manage papers and requests.

- **Authentication**: Google SSO restricted to `@acdeducation.com`.

- **Authorization**: Access tokens (JWT) with role-based access (STUDENT, TEACHER, DEPARTMENT_ADMIN, SUPER_ADMIN). Department scoping for DEPARTMENT_ADMIN applies only to admin operations (paper CRUD, request approvals); homepage browsing shows all departments.

- **Data contract**: API returns UI-ready, nested objects (no raw IDs-only responses).

- **File access**:
    - Students: only if their request is ACCEPTED **and** the paper is not archived. Archived papers
      are treated as unavailable and should result in HTTP 404 (`RESOURCE_NOT_AVAILABLE`).
    - Teachers: only if their request is ACCEPTED **and** the paper is not archived. Archived papers
      are treated as unavailable and should result in HTTP 404 (`RESOURCE_NOT_AVAILABLE`).
    - Admins: full access within their department (DEPARTMENT_ADMIN) or globally (SUPER_ADMIN).

- **Archive feature**:
    - Papers can be archived/unarchived by admins.
    - Archived papers are hidden from students' library.
    - Archived papers are visible in teacher view (can see metadata but cannot request or download).
    - Students with previously ACCEPTED requests cannot download archived papers; UI should badge "Archived".

---

## Roles & Capabilities

| Role             | Department | Can View Metadata                               | Can Download/View PDF                           | Can CRUD Papers             | Can Approve/Reject Requests                 |
| ---------------- | ---------- | ----------------------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| STUDENT          | null       | All non-archived papers, all departments        | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| TEACHER          | null       | All papers, including archived, all departments | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| DEPARTMENT_ADMIN | Required   | All papers, including archived, all departments | Full for their department                       | Full for their department   | Approve/reject requests in their department |
| SUPER_ADMIN      | null       | All papers, including archived, all departments | Full across all departments                     | Full across all departments | Full across all departments                 |

---

### Page Access

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

## File Storage Handling

- **Local Filesystem:** PDF files are stored directly on the server's local filesystem using Java
  File I/O operations.
- **Docker Volume Mount:** A host directory is mounted to the container (e.g.,
  `-v /opt/repo/data:/app/uploads`) to persist files across container restarts.
- **Performance:** Direct filesystem access provides lower latency compared to remote storage
  services like S3.
- **Deployment Considerations:** This approach creates a stateful deployment that couples files to a
  specific server instance.
- **Scalability Limitations:** Horizontal scaling requires shared storage (NFS) or prevents multiple
  instances from being viable.
- **Reliability:** Files are tied to the physical server; proper backup strategy (e.g., cron job
  with rsync) is essential for disaster recovery.
- **Database Design:** The `file_path` column stores only the relative file path (e.g.,
  `2023/dept_cs/paper_123.pdf`) rather than full API paths. The complete URL is constructed
  dynamically in the DTO/Mapper layer.
- **Cost:** No external storage services or cloud storage fees required for basic deployment.

---

## Database Schema

For the full database design and migration, see the [Database](./database_migration.md).

---

## API Endpoints

For detailed API documentation including request/response schemas, error codes, and authorization
requirements, see the full [API Contract](./api_contract.md).

---

## AuthN/AuthZ

- **Authentication (AuthN)**:
    - Frontend obtains **Google OAuth authorization code** via Google Identity Services.

    - Backend exchanges the code for:
        - Access token (JWT) - short-lived (60 minutes), returned in JSON body.
        - Refresh token - long-lived (30 days), **returned in `httpOnly`, `Secure`,
          `SameSite=Strict`, `Path=/api/auth/` cookie**.

    - Backend verifies the **Google ID token**:
        - Signature, Issuer, Audience, Expiry.
        - Domain enforced: must be `acdeducation.com`.
        - Extracts user profile data: `email`, `name`, `picture` (from `profile` OAuth scope).

    - On first login, a new user record is created with:
        - Default role: `STUDENT`
        - Profile picture URL from Google (extracted from ID token claims)
        - Profile picture is stored as a URL string (not binary) to minimize storage and leverage Google's CDN

- **Token Refresh Flow (Cookie-Based)**:
    - When access token expires, frontend calls `/api/auth/refresh`.
    - **Browser automatically attaches the `refreshToken` cookie** (no manual storage in React).
    - Backend validates refresh token against database records (checks expiration).
    - If a refresh token is used again (e.g., due to network issues), the server returns 401 Unauthorized and the client redirects to login.
    - Backend generates new access token and new refresh token.
    - **Rotation:** Old refresh token is revoked; new refresh token is sent via a new `Set-Cookie` header.
    - New access token is returned in JSON body.
    - **Note:** `/api/auth/refresh` is a public endpoint (no JWT required) but it does require the `refreshToken` to be present in an `HttpOnly` cookie. Browsers attach the cookie automatically; the frontend must never attempt to read or store the refresh token directly.

- **Logout Flow**:
    - Frontend calls `/api/auth/logout`.
    - **Browser automatically attaches the `refreshToken` cookie**.
    - Backend finds the token in the database and deletes it (server-side revocation).
    - Backend responds with a `Set-Cookie` header that overwrites the cookie with an immediate
      expiration (`Max-Age=0`), clearing it from the browser.
    - **Note:** `/api/auth/logout` is also public (no JWT required) but requires the `refreshToken` cookie
      to locate and revoke the token server-side. The frontend must never attempt to read or store the
      refresh token directly.

- **Manual Role Assignment**:
    - Privileged roles (Teacher, Admin) are managed on the backend. Contact the devs to request changes.
    - When a user logs in via Google SSO, the system checks their email against this configuration to determine their role and assigned department (if applicable).
    - If the email is not found in the configuration, the user is assigned the default `STUDENT` role.
    - Any changes to privileged roles may require a service restart or a fresh login by the user.

- **Access Token Structure (JWT)**:
    - **Claims**: `sub` (userId), `email`, `fullName`, `role`, `departmentId`, `profilePictureUrl` ,`iat`, `exp`, `iss`.
    - Lifetime: 60 minutes.
    - Backend uses `sub` for all RBAC/ABAC queries.

- **Refresh Token**:
    - Opaque, unique string stored in database.
    - Lifetime: 30 days.
    - **Transport:** Strictly `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/` cookie
      (never in JSON body).
    - Primary security relies on expiration + rotation.

- **Authorization (AuthZ)**:
    - Spring Security + service-layer enforcement.
    - File access rules strictly enforced on backend (Student/Teacher require `ACCEPTED` request +
      non-archived paper).

---

## Security

- **HTTPS** required (Cookies must be `Secure`).
- **CORS**: Dev allowed; Prod strict.
- **Cookies**: `HttpOnly`, `Secure`, `SameSite=Strict` (Mitigates XSS and CSRF).
- **Rate limiting**: Handled at the proxy layer (API gateway or reverse proxy). The proxy should
  rate-limit high-risk endpoints (login, create-request, refresh) and return standard HTTP 429
  responses with `Retry-After` when applicable.
- **Database constraint**: Partial unique index prevents duplicate PENDING/ACCEPTED requests for
  same user/paper, solving race condition issues.
- **File validation**: MIME + size limits (20MB).
- **Logging**: Audit decisions including token refresh attempts.
- **Refresh token rotation**: New token issued on every use; old token invalidated.

## Data Privacy & Collection

The system is designed with a "minimal data" approach to prioritize security and user privacy:

- **Authentication:** Handled entirely via Google OAuth 2.0. The system **never** sees or stores user passwords.
- **Identity:** We store only the user's Full Name, school email (`@acdeducation.com`), and Google profile picture URL.
- **Academic Data:** Research metadata (Title, Author, Abstract, Department) and the uploaded PDF/DOCX files.
- **Project Phase:** During this **Alpha** stage, data is for development purposes. Users should maintain original copies of all documents as data persistence is not yet guaranteed.

## Error & Validation Conventions

For complete endpoint-specific error codes and frontend rendering rules, see the
[API Contract](./api_contract.md).
