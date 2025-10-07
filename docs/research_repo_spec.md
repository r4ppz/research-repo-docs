# Research Repository — Comprehensive Architecture & Implementation Spec (V1)

Version: 2025-10-07  
Audience: Frontend + Backend devs, TLs, stakeholders  
Status: V1 — First version. If anything in code or API contradicts this, fix the code.

This spec is intentionally blunt and detailed. It is the SINGLE SOURCE OF TRUTH for backend and frontend data design and API contract.  
All changes must be documented here first, then implemented.

---

## 0) High-level Summary

- Purpose: A gated school research repository where students can browse paper metadata and request access to full documents; admins manage requests and papers.
- Authentication: Google SSO (acdeducation.com only).
- Authorization: JWT with role-based access (Student, Department Admin, Super Admin) + department scoping for admins.
- Data contract: API returns UI-ready, nested objects (no raw IDs-only in responses).
- File access: Gated endpoint; admins always allowed; students allowed only if their request is ACCEPTED.
- Archive feature: Admins can archive/unarchive papers. Archived papers are hidden from Library by default, listed in a separate admin “Archived” view, and blocked from new student requests. Prior accepted student access remains downloadable.

---

## 1) Roles & Capabilities

- STUDENT
  - Department: none (department = null)
  - View paper metadata (non-archived by default)
  - Create document requests (only for non-archived papers)
  - View own requests and download only if request is ACCEPTED
  - Pages: Library (homepage), Requests (table with Download when accepted)
  - Notes: If a paper later becomes archived, their existing ACCEPTED request still allows download; UI should badge “Archived”.

- DEPARTMENT_ADMIN
  - Has a department (department ≠ null)
  - View all papers (active and archived, with filters)
  - Approve/reject student requests for their department
  - Manage papers in their department: add (metadata + file), edit (metadata), delete, archive/unarchive
  - Pages: Library (same as student for active papers), Requests (no download; approve/reject actions), Research (table with tabs/filters for Active vs Archived + CRUD + optional stats)

- SUPER_ADMIN
  - Department: none (department = null)
  - Can do anything a department admin can across all departments
  - Has department filter on admin views
  - Pages: Library (same), Requests (with department filter), Research (with department and archived filters, optional global stats)

Access rules (server-enforced):

- Students see metadata for active (archived=false) papers by default; new requests only against non-archived papers.
- Department Admins manage only their department’s requests/papers; full file access for their department, including archived.
- Super Admins manage and access everything.

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
CREATE TYPE paper_status AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');
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
  abstract TEXT NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  status paper_status NOT NULL DEFAULT 'SUBMITTED',
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
- Archive is an orthogonal flag to status.

---

## 4) Domain Types (Authoritative, for API and frontend)

```typescript
export type Role = "STUDENT" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
export type PaperStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
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
  status: PaperStatus;
  fileUrl: string; // API path (gated), e.g. /api/files/uuid.pdf
  archived: boolean; // NEW
  archivedAt?: string | null; // ISO datetime when archived (optional)
}

export interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // ISO datetime
  paper: ResearchPaper; // nested full object
  requester: User; // nested full object
}
```

---

## 5) API Contract

See [API Contract](/docs/api_contract.md).

Highlights for archive feature:

- GET /api/papers — returns only archived=false for everyone by default; admins can filter.
- GET /api/admin/papers — admin-only view with archived filter.
- PUT /api/admin/papers/{id}/archive — archive a paper (idempotent).
- PUT /api/admin/papers/{id}/unarchive — unarchive a paper (idempotent).
- POST /api/requests — 404 for archived papers.
- GET /api/users/me/requests — includes archived papers in payload if previously accepted.
- File download (gated): students with ACCEPTED requests can still download archived papers.

---

## 6) AuthN/AuthZ

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

## 7) Security

- HTTPS in all environments beyond local
- CORS: Allow dev origins only; strict in prod
- CSRF: If using cookies for JWT, add CSRF protection for state-changing endpoints
- Rate limiting: login, create-request endpoints (at gateway or app filter)
- File validation: check MIME by magic bytes; size limits (e.g., 20MB)
- Logging: audit request decisions (approverId, decidedAt) when implemented
- Content Security Policy for frontend build (limit sources)

---

## 8) Error & Validation Conventions

- 400: Validation errors (missing fields, invalid dates)
- 401: Missing/invalid JWT
- 403: Role/department scoping or domain restriction failed
- 404: Not found (paper, request, file); also used when trying to request an archived paper (to avoid leaking)
- 409: Duplicate request (already exists userId+paperId)
- 413/415 for file upload issues

Error body:

```json
{ "error": "Message", "code": "OPTIONAL_CODE" }
```

Validation (examples):

- CreatePaper meta: title, authorName, abstractText non-empty; departmentId valid; submissionDate is ISO date and not absurd future
- Upload: PDF/DOCX only; max size 20MB

---

## 9) Observability & Logging

- Log JSON lines with requestId, userId, role, endpoint, status, duration
- Track:
  - Auth successes/failures
  - Request creations and decisions
  - File download attempts (allowed/denied)
  - Archive/unarchive actions (paperId, adminId, timestamp)
- Metrics (later): latency percentiles, error rates, DB pool, queue depths

---

## 10) Sample JSONs

ResearchPaper (archived):

```json
{
  "paperId": 101,
  "title": "Quantum Cats",
  "authorName": "Jane Doe",
  "abstractText": "Feline quantum mechanics.",
  "department": { "departmentId": 2, "departmentName": "Physics" },
  "submissionDate": "2025-09-15",
  "status": "APPROVED",
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

DocumentRequest (paper archived after acceptance):

```json
{
  "requestId": 1,
  "status": "ACCEPTED",
  "requestDate": "2025-10-01T14:00:00Z",
  "paper": { "...": "ResearchPaper (archived=true)" },
  "requester": { "...": "User fields" }
}
```
