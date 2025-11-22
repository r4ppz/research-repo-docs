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
- Teachers can request non-archived papers (same validation rules as students: paper must exist, not be archived, and unique request per user/paper).

---

## Tech Stack

- **Frontend:** Vite, React + TypeScript, React Router, Axios, CSS Modules
- **Backend:** Java 21, Spring Boot 3, Spring Web, Security, Data JPA, Validation, Flyway, PostgreSQL
- JWT-based authentication
- Google ID Token verification for SSO
- springdoc-openapi for Swagger (later)
- Docker (deployment)

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
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    abstract_text TEXT NOT NULL,
    file_url VARCHAR(512) NOT NULL,
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
    UNIQUE(user_id, paper_id)
);
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
  submissionDate: string; // ISO date
  fileUrl: string; // API path (gated)
  archived: boolean;
  archivedAt?: string | null; // ISO datetime
}

export interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string;
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

**Admin Requests**

- `GET /api/admin/requests` → scoped by department or all
- `PUT /api/admin/requests/{id}` → approve/reject

**Admin Papers**

- `POST /api/admin/papers`
- `PUT /api/admin/papers/{id}`
- `DELETE /api/admin/papers/{id}`
- `PUT /api/admin/papers/{id}/archive`
- `PUT /api/admin/papers/{id}/unarchive`
- `GET /api/admin/papers` → list admin papers with filters

For detailed API documentation including request/response schemas, error codes, and authorization requirements, see the full [API Contract](/docs/api_contract.md).

---

## AuthN/AuthZ

- **Authentication (AuthN)**:
  - Frontend obtains **Google OAuth authorization code** via Google Identity Services.
  - Backend exchanges the code for:
    - Access token (JWT) - short-lived (60 minutes)
    - Refresh token - long-lived (30 days), stored in database
  - Backend verifies the **Google ID token**:
    - Signature
    - Issuer (`accounts.google.com`)
    - Audience (your Google client ID)
    - Expiry
    - Domain enforced: must be `acdeducation.com`

  - On first login, a new user record is created with default role `STUDENT`.

- **Token Refresh Flow**:
  - When access token expires, frontend calls `/api/auth/refresh` with the refresh token
  - Backend validates refresh token against database records (checks expiration)
  - For security, if a refresh token is used twice (indicating potential theft), all tokens for that user are revoked
  - Backend generates new access token and new refresh token
  - Old refresh token is replaced with new one (rotation)
  - New tokens are returned to frontend for continued session

- **Manual Role Assignment**:
  - Teacher and admin emails are inserted manually via:
    - Flyway migration
    - OR backend seed script

  - Roles are `DEPARTMENT_ADMIN` (with department) or `SUPER_ADMIN` (no department).

- **Access Token Structure (JWT)**:
  - **Claims**:
    - `sub`: `userId` (primary key from users table)
    - `email`: user email
    - `fullName`: user full name
    - `role`: `STUDENT` | `DEPARTMENT_ADMIN` | `SUPER_ADMIN`
    - `departmentId`: nullable, only for admins
    - `iat`: issued-at timestamp
    - `exp`: expiry timestamp
    - `iss`: issuer, e.g., `"acdeducation-repo-backend"`

  - Lifetime: 60 minutes (configurable)
  - Backend uses `sub` for all RBAC and department-scoped queries; other claims are for convenience/UI.

- **Refresh Token**:
  - Secure random token string stored in database with UNIQUE constraint
  - Lifetime: 30 days (configurable)
  - Stored with user_id reference and expiration timestamp
  - Primary security relies on expiration with reuse detection for theft protection

- **Authorization (AuthZ)**:
  - Spring Security + service-layer enforcement.
  - Department scoping applied for `DEPARTMENT_ADMIN` actions.
  - File access rules:
    - `SUPER_ADMIN`: unrestricted
    - `DEPARTMENT_ADMIN`: full access to papers in their department, including archived
    - `STUDENT`: access only to non-archived papers with `ACCEPTED` request
    - `TEACHER`: access only to non-archived papers with `ACCEPTED` request

  - Never trust frontend; all enforcement occurs on backend.

---

## Security

- HTTPS for production
- CORS: dev allowed; prod strict
- CSRF: if cookies used
- Rate limiting: login, create-request, and token refresh endpoints (MVP)
- File validation: MIME + size limits (e.g., 20MB)
- Logging: audit decisions including token refresh attempts
- Content Security Policy (frontend)
- Refresh token rotation: new refresh token issued on each use; old token replaced
- Refresh token reuse detection: if a token is used twice, all user tokens are revoked as security measure

---

## Error & Validation Conventions

| HTTP    | Condition                                                                      |
| ------- | ------------------------------------------------------------------------------ |
| 400     | Validation error                                                               |
| 401     | Missing/invalid access token (JWT) or expired refresh token                  |
| 403     | Role/department scope failed                                                   |
| 404     | Not found (paper, request, file; also used to prevent leaking archived papers) |
| 409     | Duplicate request (user+paper) or refresh token reuse detected (potential theft) |
| 413/415 | File upload issues                                                             |

Canonical response:

```json
{
  "error": "Message",
  "code": "OPTIONAL_CODE",
  "details": [],
  "traceId": "..."
}
```
