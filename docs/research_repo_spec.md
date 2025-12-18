# Research Repository — Architecture & Implementation Spec

This spec is intentionally blunt and detailed. It is the **single source of truth** for backend and frontend data design, API contracts, and authorization logic. All changes must be documented here first, then implemented.

---

## High-level Summary

- Purpose: A gated school research repository where students can browse paper metadata, request access to full documents, and where admins manage papers and requests.
- Authentication: Google SSO restricted to `@acdeducation.com`.
- Authorization: Access tokens (JWT) with role-based access (STUDENT, TEACHER, DEPARTMENT_ADMIN, SUPER_ADMIN). Department scoping applies only to DEPARTMENT_ADMIN.
- Data contract: API returns UI-ready, nested objects (no raw IDs-only responses).
- File access:
  - Students: only if their request is ACCEPTED **and** the paper is not archived.
  - Teachers: only if their request is ACCEPTED **and** the paper is not archived.
  - Admins: full access within their department (DEPARTMENT_ADMIN) or globally (SUPER_ADMIN).

- Archive feature:
  - Papers can be archived/unarchived by admins.
  - Archived papers are hidden from students’ library.
  - Archived papers are visible in teacher view (metadata only) and in admin “Archived” view.
  - Students with previously ACCEPTED requests cannot download archived papers; UI should badge “Archived”.

---

## Roles & Capabilities

| Role             | Department | Can View Metadata               | Can Download/View PDF                           | Can CRUD Papers             | Can Approve/Reject Requests                 |
| ---------------- | ---------- | ------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| STUDENT          | null       | Non-archived papers             | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| TEACHER          | null       | All papers (including archived) | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| DEPARTMENT_ADMIN | Required   | All papers in their department  | Full for their department                       | Full for their department   | Approve/reject requests in their department |
| SUPER_ADMIN      | null       | All papers                      | Full across all departments                     | Full across all departments | Full across all departments                 |

### Page Access

- **STUDENT**
  - `/` → Library (non-archived)
  - `/student/requests` → Own requests

- **TEACHER**
  - `/` → Library (all papers metadata)
  - `/teacher/requests` → Own requests

- **DEPARTMENT_ADMIN**
  - `/` → Library (all papers metadata in dept)
  - `/department-admin/requests` → Request approvals
  - `/department-admin/research` → Paper management

- **SUPER_ADMIN**
  - `/` → Library
  - `/super-admin/requests` → Request approvals
  - `/super-admin/research` → Paper management

---

## Frontend Considerations

- Common API endpoints for filters (all roles):
  - `GET /api/filters/years`
  - `GET /api/filters/departments`
  - `GET /api/filters/dates`

- Teachers see archived papers metadata but can only download files if they have an ACCEPTED request for non-archived papers.

- Students see only non-archived papers; download restricted by request status and archive state.
- Teachers can request non-archived papers only (same validation rules as students: paper must exist, not be archived, with only one active request per paper). Teachers can view archived paper metadata but cannot request archived papers.
- Students and teachers can delete their own REJECTED requests to submit new ones.
- Database constraint prevents duplicate PENDING/ACCEPTED requests, handling race conditions from double-clicks.

---

## Tech Stack

- **Frontend:** Vite, React + TypeScript, React Router, Axios, CSS Modules
- **Backend:** Java 21, Spring Boot 3, Spring Web, Security, Data JPA, Validation, Flyway, PostgreSQL
- JWT-based authentication
- Google ID Token verification for SSO
- springdoc-openapi for Swagger (later)
- Docker (deployment)

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

```sql
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    department_id INT NULL REFERENCES departments(department_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE research_papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    abstract_text TEXT NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- relative file path, e.g. '2023/dept_cs/paper_123.pdf', not full API URL
    department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
    submission_date DATE NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE document_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES research_papers(paper_id) ON DELETE CASCADE,
    request_date TIMESTAMP NOT NULL DEFAULT now(),
    status request_status NOT NULL DEFAULT 'PENDING',
);
-- Partial unique index to prevent duplicate PENDING or ACCEPTED requests for same user/paper
CREATE UNIQUE INDEX idx_unique_pending_accepted_request
ON document_requests (user_id, paper_id)
WHERE status IN ('PENDING', 'ACCEPTED');
```

For the full database migration, see the [Database Migration](/docs/database_migration.md).

---

## Domain Types (Frontend)

```typescript
export type Role = "STUDENT" | "TEACHER" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Department {
  departmentId: number;
  departmentName: string;
}

export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  department: Department | null;
}

export interface ResearchPaper {
  paperId: number;
  title: string;
  authorName: string;
  abstractText: string;
  department: Department;
  submissionDate: string; // YYYY-MM-DD
  filePath: string; // relative file path, e.g. '2023/dept_cs/paper_123.pdf'; full URL constructed dynamically by DTO/Mapper layer
  archived: boolean;
  archivedAt?: string | null; // YYYY-MM-DD or ISO datetime
}

export interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // YYYY-MM-DD
  paper: ResearchPaper; // nested
  requester: User; // nested
}

export interface FilterOptions {
  years: number[];
  departments: Department[];
  dateRange: {
    minDate: string;
    maxDate: string;
  };
}
```

---

## API Endpoints (Summary)

**Authentication**

- `POST /api/auth/google` → Google ID token (returns access and refresh tokens)
- `POST /api/auth/refresh` → Refresh access token using refresh token
- `POST /api/auth/logout` → Revoke refresh token and clear cookie

**User**

- `GET /api/users/me` → current user

**Filters**

- `GET /api/filters/years`
- `GET /api/filters/departments`
- `GET /api/filters/dates`

**Papers**

- `GET /api/papers` → paginated, filters applied
- `GET /api/papers/{id}` → specific paper

**Student/Teacher Requests**

- `GET /api/users/me/requests` → own requests (STUDENT and TEACHER roles)
- `POST /api/requests` → create new request (STUDENT and TEACHER roles)
- `DELETE /api/requests/{requestId}` → delete own request (enables re-requesting after rejection)

**Admin Requests**

- `GET /api/admin/requests` → scoped by department or all
- `PUT /api/admin/requests/{id}` → approve/reject

**Admin Papers**

- `POST /api/admin/papers` → create paper (multipart upload with two parts: `metadata` as stringified JSON and `file`)
- `PUT /api/admin/papers/{id}` → update fields
- `DELETE /api/admin/papers/{id}` → delete
- `PUT /api/admin/papers/{id}/archive` and `/unarchive` → idempotent operations
- `GET /api/admin/papers` → list with filters + pagination

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

### Canonical Error Response (Authoritative)

All error responses **MUST** conform to this structure:

```json
{
  "status": 403, // Optional, might delete later
  "code": "ACCESS_DENIED",
  "message": "You do not have permission to perform this action.",
  "details": [
    {
      "field": "paperId",
      "message": "Paper belongs to another department"
    }
  ],
  "traceId": "7f2c9b18c6e4"
}
```

### Field Semantics

| Field     | Type    | Required | Description                                                        |
| --------- | ------- | -------- | ------------------------------------------------------------------ |
| `status`  | integer | No       | HTTP status code (echoed for logging convenience)                  |
| `code`    | string  | Yes      | Machine-readable error code (stable across versions)               |
| `message` | string  | Yes      | User-safe, localized-ready error message                           |
| `details` | array   | No       | Structured validation errors (array of `{field, message}` objects) |
| `traceId` | string  | No       | Correlation ID for log lookup and support                          |

### Contract Guarantees

1. `code` is **always present** and stable across API versions
2. `message` is **always user-safe** (no stack traces, SQL errors, or file paths)
3. `details` is **structured** (never free-form strings)
4. Frontend **MUST route on `code`** for logic; `message` MAY be used for display

### HTTP Status to Error Code Mapping

| HTTP | Condition                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------- |
| 400  | Validation error or malformed request                                                          |
| 401  | Missing/invalid access token (JWT) or expired refresh token                                    |
| 403  | Role/department scope failed or domain not allowed                                             |
| 404  | Not found (paper, request, file; also used to prevent leaking archived papers)                 |
| 409  | Duplicate active request (PENDING or ACCEPTED for same user+paper) or invalid state transition |
| 413  | File too large                                                                                 |
| 415  | Unsupported file type                                                                          |
| 429  | Rate limit exceeded                                                                            |
| 500  | Internal server error or file storage failure                                                  |
| 503  | Service unavailable (database or external service down)                                        |

### Complete Error Code Registry

| Code                   | HTTP | Category | Meaning                                                         |
| ---------------------- | ---- | -------- | --------------------------------------------------------------- |
| VALIDATION_ERROR       | 400  | Input    | Field-level validation failed                                   |
| INVALID_REQUEST        | 400  | Input    | Malformed JSON or missing required fields                       |
| UNAUTHENTICATED        | 401  | Auth     | Missing or invalid JWT access token                             |
| REFRESH_TOKEN_REVOKED  | 401  | Auth     | Refresh token is invalid, expired, or revoked                   |
| ACCESS_DENIED          | 403  | AuthZ    | User lacks required role or department scope                    |
| DOMAIN_NOT_ALLOWED     | 403  | Auth     | Email domain not in whitelist                                   |
| RESOURCE_NOT_FOUND     | 404  | Data     | Resource does not exist (or user cannot know it exists)         |
| RESOURCE_NOT_AVAILABLE | 404  | Data     | Resource exists but is archived/inaccessible                    |
| DUPLICATE_REQUEST      | 409  | Business | Active request (PENDING/ACCEPTED) already exists for this paper |
| REQUEST_ALREADY_FINAL  | 409  | Business | Cannot modify request in terminal state                         |
| FILE_TOO_LARGE         | 413  | Upload   | File exceeds 20MB limit                                         |
| UNSUPPORTED_MEDIA_TYPE | 415  | Upload   | File is not PDF or DOCX                                         |
| RATE_LIMIT_EXCEEDED    | 429  | System   | Too many requests in time window                                |
| INTERNAL_ERROR         | 500  | System   | Unhandled server error                                          |
| FILE_STORAGE_ERROR     | 500  | System   | File missing on disk or I/O failure                             |
| SERVICE_UNAVAILABLE    | 503  | System   | Database or external service down                               |

### Security Considerations for Error Handling

1. **Information Leakage Prevention**
   - `RESOURCE_NOT_AVAILABLE` (archived papers) returns HTTP 404, not 403, to prevent enumeration attacks
   - Students receive identical 404 responses for non-existent papers and papers they cannot access
   - Error messages never reveal internal paths, SQL queries, or stack traces
   - All refresh token failures return identical generic messages

2. **Defensive Error Handling**
   - All unhandled exceptions are caught by global exception handler and mapped to `INTERNAL_ERROR`
   - Stack traces are logged server-side but never included in API response
   - Database constraint violations are mapped to appropriate business error codes (e.g., duplicate request → `DUPLICATE_REQUEST`)
   - File path traversal attempts are caught and return `INVALID_REQUEST`

3. **Frontend Error Routing**
   - Validation errors (`VALIDATION_ERROR`): Show inline field errors, no toast
   - Auth errors (`UNAUTHENTICATED`, `REFRESH_TOKEN_REVOKED`): Redirect to login, no message
   - AuthZ errors (`ACCESS_DENIED`): Show dedicated 403 page
   - Resource errors (`RESOURCE_NOT_FOUND`, `RESOURCE_NOT_AVAILABLE`): Show 404 page or archived badge, no toast
   - Business errors (`DUPLICATE_REQUEST`, `REQUEST_ALREADY_FINAL`): Page-level alert
   - System errors (`INTERNAL_ERROR`, `FILE_STORAGE_ERROR`): Global error UI with trace ID
   - Rate limit (`RATE_LIMIT_EXCEEDED`): Show countdown and disable submission

4. **Audit Requirements**
   - All `FILE_STORAGE_ERROR` occurrences trigger monitoring alerts (potential disk failure)
   - All `INTERNAL_ERROR` responses logged with full stack trace server-side
   - All authentication failures logged for security monitoring
   - Rate limit violations logged for abuse detection

For complete endpoint-specific error codes and frontend rendering rules, see the [API Contract](/docs/api_contract.md).

---

## Configuration

### Development vs Production Environment

**Cookie Settings:**

- **Production:** `SameSite=Strict`, `Secure=True`
- **Development:** `SameSite=Lax`, `Secure=False` (to allow cross-origin requests between localhost:5173 and localhost:8080)

**CORS Settings:**

- **Development:** Allow requests from `http://localhost:5173`
- **Production:** Restrict to frontend domain only
