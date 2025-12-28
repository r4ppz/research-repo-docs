# Research Repository — Architecture & Implementation Spec

<!--toc:start-->

- [Research Repository — Architecture & Implementation Spec](#research-repository-architecture-implementation-spec)
  - [High-level Summary](#high-level-summary)
  - [Roles & Capabilities](#roles-capabilities)
    - [Page Access](#page-access)
  - [Frontend Considerations](#frontend-considerations)
  - [Tech Stack](#tech-stack)
  - [File Storage Strategy](#file-storage-strategy)
  - [Database Schema](#database-schema)
  - [API Endpoints](#api-endpoints)
  - [AuthN/AuthZ](#authnauthz)
  - [Security](#security)
  - [Error & Validation Conventions](#error-validation-conventions)
  <!--toc:end-->

This spec is intentionally blunt and detailed. It is the **single source of truth** for backend and frontend data design, API contracts, and authorization logic. All changes must be documented here first, then implemented.

---

## High-level Summary

- Purpose: A gated school research repository where students can browse paper metadata, request access to full documents, and where admins manage papers and requests.
- Authentication: Google SSO restricted to `@acdeducation.com`.
- Authorization: Access tokens (JWT) with role-based access (STUDENT, TEACHER, DEPARTMENT_ADMIN, SUPER_ADMIN). Department scoping for DEPARTMENT_ADMIN applies only to admin operations (paper CRUD, request approvals); homepage browsing shows all departments.
- Data contract: API returns UI-ready, nested objects (no raw IDs-only responses).
- File access:
  - Students: only if their request is ACCEPTED **and** the paper is not archived.
  - Teachers: only if their request is ACCEPTED **and** the paper is not archived.
  - Admins: full access within their department (DEPARTMENT_ADMIN) or globally (SUPER_ADMIN).

- Archive feature:
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

**Note:** This table describes homepage behavior (`/` route, `/api/papers` endpoint). For admin-specific pages and endpoints (`/api/admin/*`), DEPARTMENT_ADMIN operations are scoped to their assigned department only. See Admin Papers and Admin Requests sections in the API Contract for department-scoped behavior.

---

### Page Access

- **STUDENT**
  - `/` → Library (non-archived papers, all departments)
  - `/student/requests` → Own requests

- **TEACHER**
  - `/` → Library (all papers metadata, all departments)
  - `/teacher/requests` → Own requests

- **DEPARTMENT_ADMIN**
  - `/` → Library (all papers metadata, all departments)
  - `/department-admin/requests` → Request approvals (dept-scoped)
  - `/department-admin/research` → Paper management (dept-scoped)

- **SUPER_ADMIN**
  - `/` → Library (all papers, all departments)
  - `/super-admin/requests` → Request approvals (global)
  - `/super-admin/research` → Paper management (global)

---

## Frontend Considerations

- Common API endpoints for filters (all roles):
  - `GET /api/filters/years` → returns years based on role-scoped visibility
  - `GET /api/filters/departments` → returns departments alphabetically sorted

- Frontend filtering and display:
  - Filter endpoints return all accessible data; frontend may filter displayed options based on page context (e.g., show only user's department on admin pages)
  - Use auth context (role, departmentId from JWT) to conditionally render or filter UI elements

- Search and filtering capabilities:
  - Full-text search across paper title, author name, and abstract
  - Multi-department filtering with comma-separated department IDs (e.g., "1,3,5")
  - Year-based filtering for submission dates
  - Sorting options: by submission date (default), title, or author name
  - Sort order: ascending or descending (descending is default)

---

## Tech Stack

- **Frontend:** Vite, React + TypeScript, React Router, Axios, CSS Modules
- **Backend:** Java 21, Spring Boot 3, Spring Web, Security, Data JPA, Validation, Flyway, PostgreSQL
- JWT-based authentication
- Google ID Token verification for SSO
- springdoc-openapi for Swagger
- Docker

---

## File Storage Strategy

- **Local Filesystem:** PDF files are stored directly on the server's local filesystem using Java File I/O operations.
- **Docker Volume Mount:** A host directory is mounted to the container (e.g., `-v /opt/repo/data:/app/uploads`) to persist files across container restarts.
- **Performance:** Direct filesystem access provides lower latency compared to remote storage services like S3.
- **Deployment Considerations:** This approach creates a stateful deployment that couples files to a specific server instance.
- **Scalability Limitations:** Horizontal scaling requires shared storage (NFS) or prevents multiple instances from being viable.
- **Reliability:** Files are tied to the physical server; proper backup strategy (e.g., cron job with rsync) is essential for disaster recovery.
- **Database Design:** The `file_path` column stores only the relative file path (e.g., `2023/dept_cs/paper_123.pdf`) rather than full API paths. The complete URL is constructed dynamically in the DTO/Mapper layer.
- **Cost:** No external storage services or cloud storage fees required for basic deployment.

---

## Database Schema

For the full database migration, see the [Database Migration](/docs/database_migration.md).

---

## API Endpoints

For detailed API documentation including request/response schemas, error codes, and authorization requirements, see the full [API Contract](/docs/api_contract.md).

---

## AuthN/AuthZ

- **Authentication (AuthN)**:
  - Frontend obtains **Google OAuth authorization code** via Google Identity Services.
  - Backend exchanges the code for:
    - Access token (JWT) - short-lived (60 minutes), returned in JSON body.
    - Refresh token - long-lived (30 days), **returned in `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/` cookie**.

  - Backend verifies the **Google ID token**:
    - Signature, Issuer, Audience, Expiry.
    - Domain enforced: must be `acdeducation.com`.

  - On first login, a new user record is created with default role `STUDENT`.

- **Token Refresh Flow (Cookie-Based)**:
  - When access token expires, frontend calls `/api/auth/refresh`.
  - **Browser automatically attaches the `refreshToken` cookie** (no manual storage in React).
  - Backend validates refresh token against database records (checks expiration).
  - If a refresh token is used again (e.g., due to network issues), the server returns 401 Unauthorized and the client redirects to login.
  - Backend generates new access token and new refresh token.
  - **Rotation:** Old refresh token is revoked; new refresh token is sent via a new `Set-Cookie` header.
  - New access token is returned in JSON body.

- **Logout Flow**:
  - Frontend calls `/api/auth/logout`.
  - **Browser automatically attaches the `refreshToken` cookie**.
  - Backend finds the token in the database and deletes it (server-side revocation).
  - Backend responds with a `Set-Cookie` header that overwrites the cookie with an immediate expiration (`Max-Age=0`), clearing it from the browser.

- **Manual Role Assignment**:
  - Teacher and admin emails are inserted manually via Flyway migration or backend seed script.
  - Roles are `DEPARTMENT_ADMIN` (with department) or `SUPER_ADMIN` (no department).

- **Access Token Structure (JWT)**:
  - **Claims**: `sub` (userId), `email`, `fullName`, `role`, `departmentId`, `iat`, `exp`, `iss`.
  - Lifetime: 60 minutes.
  - Backend uses `sub` for all RBAC/ABAC queries.

- **Refresh Token**:
  - Opaque, unique string stored in database.
  - Lifetime: 30 days.
  - **Transport:** Strictly `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/` cookie (never in JSON body).
  - Primary security relies on expiration + rotation.

- **Authorization (AuthZ)**:
  - Spring Security + service-layer enforcement.
  - File access rules strictly enforced on backend (Student/Teacher require `ACCEPTED` request + non-archived paper).

---

## Security

- **HTTPS** required (Cookies must be `Secure`).
- **CORS**: Dev allowed; Prod strict.
- **Cookies**: `HttpOnly`, `Secure`, `SameSite=Strict` (Mitigates XSS and CSRF).
- **Rate limiting**: Login, create-request, and refresh endpoints.
- **Database constraint**: Partial unique index prevents duplicate PENDING/ACCEPTED requests for same user/paper, solving race condition issues.
- **File validation**: MIME + size limits (20MB).
- **Logging**: Audit decisions including token refresh attempts.
- **Refresh token rotation**: New token issued on every use; old token invalidated.
- **Refresh token reuse detection (MVP approach)**: For the MVP, reuse detection is simplified. If a client attempts to use an already-revoked token, the server returns 401 Unauthorized. The client then redirects to login. This reduces complexity while maintaining security against most basic threats.

---

## Error & Validation Conventions

For complete endpoint-specific error codes and frontend rendering rules, see the [API Contract](/docs/api_contract.md).
