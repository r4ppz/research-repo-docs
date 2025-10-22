# Research Repository — Comprehensive Architecture & Implementation Spec

Version: 2025-10-22
Audience: Frontend + Backend devs
Status: V4 . If anything in code or API contradicts this, fix the code.

This spec is intentionally blunt and detailed. It is the SINGLE SOURCE OF TRUTH for backend and frontend data design and API contract.  
All changes must be documented here first, then implemented.

---

## 0) High-level Summary

- Purpose: A gated school research repository where students can browse paper metadata and request access to full documents; admins manage requests and papers.
- Authentication: Google SSO (acdeducation.com only).
- Authorization: JWT with role-based access (Student, Department Admin, Super Admin) + department scoping for admins.
- Data contract: API returns UI-ready, nested objects (no raw IDs-only in responses).
- File access: Gated endpoint; admins always allowed; students allowed only if their request is ACCEPTED.
- Archive feature: Admins can archive/unarchive papers. Archived papers are hidden from Library by default, listed in a separate admin “Archived” view, and blocked from new student requests. Prior accepted student access is no longer downloadable once paper is archived.

---

## 1) Roles & Capabilities

- STUDENT
  - Department: none (department = null)
  - View paper metadata (non-archived by default)
  - Create document requests (only for non-archived papers)
  - View own requests and download only if request is ACCEPTED AND paper is not archived
  - Pages:
    - Library (shared homepage): `/`
    - Student Requests: `/student/requests`
  - Notes: If a paper later becomes archived, their existing ACCEPTED request no longer allows download; UI should badge “Archived”.

- DEPARTMENT_ADMIN
  - Has a department (department ≠ null)
  - View all papers (active and archived, with filters)
  - Approve/reject student requests for their department
  - Manage papers in their department: add (metadata + file), edit (metadata), delete, archive/unarchive
  - Pages:
    - Library (shared homepage): `/`
    - Department Admin Requests: `/department-admin/requests` (distinct UI/page from student/super admin)
    - Department Research Admin: `/department-admin/research` (dept-scoped CRUD + Active/Archived tabs)
  - Notes: Full file access within their department (active or archived).

- SUPER_ADMIN
  - Department: none (department = null)
  - Can do anything a department admin can across all departments
  - Has department filter on admin views
  - Pages:
    - Library (shared homepage): `/`
    - Super Admin Requests: `/super-admin/requests` (global scope + department filter; distinct from student/department admin)
    - Global Research Admin: `/super-admin/research` (global scope, department + archived filters, optional global stats)

Access rules (server-enforced):

- Students see metadata for active (archived=false) papers by default; new requests only against non-archived papers.
- Department Admins manage only their department’s requests/papers; full file access for their department, including archived.
- Super Admins manage and access everything.

### 1.1 Frontend Considerations

- Common API endpoints for UI filters (usable by all roles):
  - GET /api/filters/years → for year filtering
  - GET /api/filters/departments → for department filtering
  - GET /api/filters/dates → for date range filtering

---

## 2) Tech Stack

- Frontend:
  - Vite, TypeScript, React
  - React Router
  - Axios
  - CSS Modules
- Backend:
  - Java 21, Spring Boot 3
  - Spring Web, Security, Data JPA, Validation
  - PostgreSQL + Flyway
  - JWT (jjwt)
  - Google ID Token verification (google-auth-library-oauth2-http)
  - springdoc-openapi for Swagger
- Dev/Infra:
  - Docker Compose (Postgres)
  - .editorconfig, ESLint/Prettier (frontend)
  - CI-friendly

---

## 3) Canonical Database Schema (Postgres)

V1:

```sql
CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  department_name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TYPE user_role AS ENUM ('STUDENT', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

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
  abstract TEXT NOT NULL, -- API field name is abstractText
  file_url VARCHAR(512) NOT NULL,
  department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_papers_archived ON research_papers(archived);
```

Notes:

- Student users: `department_id` is NULL.
- Department admins: `department_id` set to their department.
- Super admins: `department_id` NULL.
- Papers always have `department_id`.
- Archive is a visibility toggle independent from requests/permissions.

---

## 4) Domain Types (Authoritative, for API and frontend)

```typescript
export type Role = "STUDENT" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
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
  submissionDate: string; // ISO date (YYYY-MM-DD)
  fileUrl: string; // API path (gated), e.g. /api/files/uuid.pdf
  archived: boolean; // visibility toggle
  archivedAt?: string | null; // ISO datetime when archived (optional)
}

export interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // ISO datetime
  paper: ResearchPaper; // nested full object
  requester: User; // nested full object
}

export interface FilterOptions {
  years: number[];
  departments: Department[];
  dateRange: {
    minDate: string; // ISO date (YYYY-MM-DD)
    maxDate: string; // ISO date (YYYY-MM-DD)
  };
}
```

---

## 5) API Endpoints Summary

The system provides a comprehensive REST API with the following core endpoints:

**Authentication:**

- `POST /api/auth/google` - Authenticate using Google ID token

**User:**

- `GET /api/users/me` - Get current user details

**Filter:**

- `GET /api/filters/years` - Get distinct years for filtering
- `GET /api/filters/departments` - Get all departments for filtering
- `GET /api/filters/dates` - Get date range for filtering

**Papers:**

- `GET /api/papers` - List papers with pagination and filters
- `GET /api/papers/{id}` - Get specific paper details

**Student Requests:**

- `GET /api/users/me/requests` - Get own requests
- `POST /api/requests` - Create new document request

**Admin Requests:**

- `GET /api/admin/requests` - Get requests for admin's department or all (super admin)
- `PUT /api/admin/requests/{id}` - Approve/reject requests

**Admin Papers:**

- `POST /api/admin/papers` - Create new paper (admin only)
- `PUT /api/admin/papers/{id}` - Update paper details
- `DELETE /api/admin/papers/{id}` - Delete paper
- `PUT /api/admin/papers/{id}/archive` - Archive paper
- `PUT /api/admin/papers/{id}/unarchive` - Unarchive paper
- `GET /api/admin/papers` - List admin papers with filters

**Files:**

- `GET /api/files/{fileIdOrName}` - Download gated file content

For detailed API documentation including request/response schemas, error codes, and authorization requirements, see the full [API Contract](/docs/api_contract.md).

---

## 6) API Contract

See [API Contract](/docs/api_contract.md).

Updates highlighted:

- GET /api/papers/{id} — students get 404 if paper is archived (regardless of request status).
- GET /api/files/{fileIdOrName} — no paperId query param; server derives ownership and enforces authZ.
- POST /api/admin/papers — returns the full created ResearchPaper (201).
- New filter endpoints: GET /api/filters/years, GET /api/filters/departments, GET /api/filters/dates
- Updated file access: students can no longer download archived papers even with ACCEPTED requests
- Added summary API endpoints section to this spec document

---

## 7) AuthN/AuthZ

- AuthN: Google Identity Services on frontend; backend verifies ID token:
  - Signature, issuer (accounts.google.com), audience (clientId), expiry
  - Enforce acdeducation.com domain via hd claim and/or email suffix
- On success:
  - User record upserted (default role STUDENT)
  - JWT issued with claims: sub (userId), email, fullName, role, deptId (if any), iat, exp, iss
- AuthZ:
  - Spring Security routes + method-level checks; never trust UI
  - Department scoping in service layer for admin actions
  - Files: enforce as described above

JWT lifetime:

- 60 minutes (configurable); refresh via re-auth (out of scope for MVP)

---

## 8) Security

- HTTPS in all environments beyond local
- CORS: Allow dev origins only; strict in prod
- CSRF: If using cookies for JWT, add CSRF protection for state-changing endpoints
- Rate limiting: login, create-request endpoints (at gateway or app filter)
- File validation: check MIME by magic bytes; size limits (e.g., 20MB)
- Logging: audit request decisions (approverId, decidedAt) when implemented
- Content Security Policy for frontend build (limit sources)

---

## 9) Error & Validation Conventions

- 400: Validation errors (missing fields, invalid dates)
- 401: Missing/invalid JWT
- 403: Role/department scoping or domain restriction failed
- 404: Not found (paper, request, file); also used when trying to request an archived paper (to avoid leaking)
- 409: Duplicate request (already exists userId+paperId)
- 413/415 for file upload issues

Error body (canonical):

```json
{ "error": "Message", "code": "OPTIONAL_CODE", "details": [], "traceId": "..." }
```

Validation (examples):

- CreatePaper meta: title, authorName, abstractText non-empty; departmentId valid; submissionDate is ISO date and not absurd future
- Upload: PDF/DOCX only; max size 20MB
- multipart meta part is application/json

---

## 10) Observability & Logging

- Log JSON lines with requestId, userId, role, endpoint, status, duration
- Track:
  - Auth successes/failures
  - Request creations and decisions
  - File download attempts (allowed/denied)
  - Archive/unarchive actions (paperId, adminId, timestamp)
- Metrics (later): latency percentiles, error rates, DB pool, queue depths

---

## 11) Sample JSONs

ResearchPaper (archived):

```json
{
  "paperId": 101,
  "title": "Quantum Cats",
  "authorName": "Jane Doe",
  "abstractText": "Feline quantum mechanics.",
  "department": { "departmentId": 2, "departmentName": "Physics" },
  "submissionDate": "2025-09-15",
  "fileUrl": "/api/files/abcd1234.pdf",
  "archived": true,
  "archivedAt": "2025-10-07T03:10:00Z"
}
```

User (student):

```json
{
  "userId": 1,
  "email": "alice@acdeducation.com",
  "fullName": "Alice Student",
  "role": "STUDENT",
  "department": null
}
```

DocumentRequest (paper archived after acceptance - student no longer has access):

```json
{
  "requestId": 1,
  "status": "ACCEPTED",
  "requestDate": "2025-10-01T14:00:00Z",
  "paper": {
    "paperId": 101,
    "title": "Quantum Cats",
    "authorName": "Jane Doe",
    "abstractText": "Feline quantum mechanics.",
    "department": { "departmentId": 2, "departmentName": "Physics" },
    "submissionDate": "2025-09-15",
    "fileUrl": "/api/files/abcd1234.pdf",
    "archived": true,
    "archivedAt": "2025-10-07T03:10:00Z"
  },
  "requester": { "...": "User fields" }
}
```

Note: Even though this request is ACCEPTED, the student can no longer access the paper since it's archived.

---
