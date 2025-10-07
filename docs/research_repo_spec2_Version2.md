# Research Repository — Comprehensive Architecture & Implementation Spec

Version: 2025-10-07  
Audience: Frontend + Backend devs, TLs, stakeholders  
Status: FINAL — This is the single source of truth. If anything in code contradicts this, fix the code.

This spec is intentionally blunt and detailed. It prioritizes a clean contract between frontend and backend, safe data design, and a predictable developer experience.

Build to this spec. If you feel the urge to deviate, you probably don’t have a strong enough reason. Document changes here first, then change code. That’s how you keep the team aligned and avoid refactor hell.

---

## 0) High-level Summary

- Purpose: A gated school research repository where students can browse paper metadata and request access to full documents; admins manage requests and papers.
- Authentication: Google SSO (acdeducation.com only).
- Authorization: JWT with role-based access (Student, Department Admin, Super Admin) + department scoping for admins.
- Data contract: API returns UI-ready, nested objects (no raw IDs-only in responses).
- File access: Gated endpoint; admins always allowed; students allowed only if their request is ACCEPTED.
- Architecture: Monorepo; React (Vite/TS) frontend; Spring Boot + Postgres backend; Flyway migrations; layered backend; typed API.
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
  - CI-friendly monorepo

---

## 3) Project Structure (Monorepo) - not mandatory

Monorepo is used to keep contracts, types, and documentation in one place; simplifies coordination across FE/BE.

```
repo-root/
├─ README.md
├─ docs/
│  ├─ RESEARCH-REPOSITORY-SPEC-FINAL.md
│  └─ API-CONTRACT.md
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ tsconfig.json
│  ├─ .env.example
│  └─ src/
│     ├─ app/                 # main.tsx, App.tsx, router.tsx
│     ├─ features/            # auth, library, requests, admin
│     ├─ components/          # ui, layout, domain widgets
│     ├─ api/                 # axios wrappers (thin)
│     ├─ types/               # domain.ts (authoritative TS types)
│     ├─ mocks/               # dummyData.ts (dev only)
│     ├─ hooks/               # useApi, useRole, etc.
│     ├─ lib/                 # download.ts, constants.ts
│     └─ styles/              # globals.css, tokens.css
└─ backend/
   ├─ pom.xml
   ├─ docker-compose.yml       # Postgres
   └─ src/
      ├─ main/java/com/acd/research/
      │  ├─ ResearchRepositoryApplication.java
      │  ├─ config/            # Security, OpenAPI, CORS
      │  ├─ security/          # JwtService, JwtAuthFilter
      │  ├─ auth/              # GoogleAuthController
      │  ├─ controller/        # Paper, Request, File, Admin
      │  ├─ service/           # PaperService, StorageService
      │  ├─ repo/              # JPA repositories
      │  ├─ dto/               # Request/response DTOs
      │  ├─ model/             # Entities & enums
      │  └─ exception/         # Global handler
      └─ main/resources/
         ├─ application.yml
         └─ db/migration/
            ├─ V1__init.sql
            └─ V2__add_paper_archive.sql
```

---

## 4) Canonical Database Schema (Postgres)

V1 (existing):
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

V2 (Archive feature):
```sql
-- backend/src/main/resources/db/migration/V2__add_paper_archive.sql
ALTER TABLE research_papers
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN archived_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_papers_archived ON research_papers(archived);
-- Optional if you commonly filter by both:
-- CREATE INDEX IF NOT EXISTS idx_papers_status_archived ON research_papers(status, archived);
```

Notes:
- Student users: `department_id` is NULL.
- Department admins: `department_id` set to their department.
- Super admins: `department_id` NULL.
- Papers always have `department_id`.
- Archive is orthogonal to status. Archiving hides a paper from default listings and blocks new student requests.

---

## 5) Frontend Domain Types (Authoritative)

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
  // Students and Super Admins have no department; Dept Admins do.
  department: Department | null;
}

export interface ResearchPaper {
  paperId: number;
  title: string;
  authorName: string;
  abstractText: string;
  department: Department; // nested object; never just id
  submissionDate: string; // ISO date (YYYY-MM-DD)
  status: PaperStatus;
  fileUrl: string;        // API path (gated), e.g. /api/files/uuid.pdf
  archived: boolean;      // NEW
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

Non-negotiable: API responses MUST match these shapes. No IDs-only in responses.

---

## 6) API Contract (FINAL — see docs/API-CONTRACT.md for full details)

General:
- All responses are camelCase.
- All endpoints require authentication (except /api/auth/**).
- All foreign relationships are nested objects (not only IDs).

Key endpoints (delta for Archive feature):
- GET /api/papers
  - Default returns only archived=false for everyone.
  - Admins may pass `archived=true|false` to filter explicitly; students cannot request archived=true.
- GET /api/admin/papers
  - Admin-only listing with `archived` and `departmentId` filters (plus pagination).
- PUT /api/admin/papers/{id}/archive
  - Idempotent; sets `archived=true`, `archivedAt=now()`.
- PUT /api/admin/papers/{id}/unarchive
  - Idempotent; sets `archived=false`, `archivedAt=null`.
- POST /api/requests
  - 404 for archived papers (block new requests).
- GET /api/users/me/requests
  - Continues to include archived papers inside each request payload so students can download previously accepted papers (download still gated).
- Files:
  - Students with ACCEPTED requests can still download archived papers via `/api/files/...`.

See the API contract file for every endpoint’s request/response and errors.

---

## 7) AuthN/AuthZ

- AuthN: Google Identity Services on frontend; backend verifies ID token:
  - Signature, issuer (accounts.google.com), audience (clientId), expiry
  - Enforce acdeducation.com domain via hd claim and/or email suffix
- On success:
  - User record upserted (default role STUDENT unless preassigned)
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
- CSRF: If you switch to HttpOnly cookies for JWT, add CSRF protection for state-changing endpoints
- Rate limiting: login, create-request endpoints (at gateway or app filter)
- File validation: check MIME by magic bytes; size limits (e.g., 20MB)
- Logging: audit request decisions (approverId, decidedAt) when implemented
- Content Security Policy for frontend build (limit sources)

---

## 9) Frontend Flows (Non-UI-centric)

- Login flow:
  - User clicks “Sign In”
  - Frontend exchanges Google credential with backend → receives JWT + sets in-memory auth state
  - Fetch /api/users/me → sets user (name, role, department)

- Student request flow:
  - Library shows ResearchPaper cards from /api/papers (archived=false by default)
  - Student opens Requests page → /api/users/me/requests
  - Student clicks “Request access” → POST /api/requests (blocked if paper.archived)
  - After admin accepts → student sees Download button
  - Download calls paper.fileUrl with paperId param

- Admin triage flow:
  - Admin Requests page → GET /api/admin/requests
  - Admin accepts/rejects → PUT /api/admin/requests/{id}

- Admin research management:
  - Active tab: GET /api/admin/papers?archived=false
  - Archived tab: GET /api/admin/papers?archived=true
  - Create paper → POST /api/admin/papers (multipart; status defaults to SUBMITTED)
  - Edit metadata → PUT /api/admin/papers/{id}
  - Archive/unarchive → PUT /api/admin/papers/{id}/archive or /unarchive
  - Delete → DELETE /api/admin/papers/{id}

---

## 10) Error & Validation Conventions

- 400: Validation errors (missing fields, invalid dates)
- 401: Missing/invalid JWT
- 403: Role/department scoping or domain restriction failed
- 404: Not found (paper, request, file); also used when trying to request an archived paper (to avoid leaking)
- 409: Duplicate request (already exists userId+paperId)
- 413/415 for file upload issues
- Error body:
```json
{ "error": "Message", "code": "OPTIONAL_CODE" }
```

Validation (examples):
- CreatePaper meta: title, authorName, abstractText non-empty; departmentId valid; submissionDate is ISO date and not absurd future
- Upload: PDF/DOCX only; max size 20MB

---

## 11) Environment & Configuration

Frontend (.env):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=REPLACE
```

Backend (application.yml):
```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/research_repo
    username: research
    password: research
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
app:
  jwt:
    issuer: "acd-research"
    expiration-minutes: 60
    secret: "REPLACE_WITH_BASE64_256BIT_SECRET"
  auth:
    google:
      clientId: "REPLACE_WITH_GOOGLE_CLIENT_ID"
      allowedDomain: "acdeducation.com"
  storage:
    uploadDir: "./uploads"
  cors:
    allowed-origins:
      - "http://localhost:5173"
```

---

## 12) Local Development

- DB: `cd backend && docker compose up -d`
- Backend: set application.yml values, run `./mvnw spring-boot:run`
- Frontend: `cp frontend/.env.example frontend/.env`, set vars, `npm i && npm run dev` inside frontend
- Seed: Flyway V1 creates base types; V2 adds archive columns; add departments via API or SQL as needed

---

## 13) Testing Strategy

- Unit:
  - Backend: services (PaperService, StorageService, RequestService), JwtService
- Integration:
  - MockMvc + Testcontainers (Postgres) for controllers + security
  - Verify department scoping and file access logic
  - Verify archive behavior:
    - /api/papers excludes archived
    - Admin list supports archived filter
    - POST /api/requests blocked for archived
    - /api/users/me/requests still returns archived papers inside request payloads
- Frontend:
  - Component tests (role-based rendering)
  - E2E (later): student request → admin approve → student download → admin archive → student still can download from Requests

---

## 14) Observability

- Log JSON lines with requestId, userId, role, endpoint, status, duration
- Track:
  - Auth successes/failures
  - Request creations and decisions
  - File download attempts (allowed/denied)
  - Archive/unarchive actions (paperId, adminId, timestamp)
- Metrics (later): latency percentiles, error rates, DB pool, queue depths

---

## 15) Core Pages

- Library (all roles):
  - Lists active (archived=false) papers with title, author, abstract preview, departmentName, submissionDate, status
  - Pagination (page, size), search/filter optional
- Requests (student):
  - Shows table of own requests with columns: Paper title, Department, Status, Request Date, Action (Download if ACCEPTED, else disabled)
  - Badge “Archived” if the paper is archived
- Requests (admin/super):
  - Shows requests with Requester (name/email), Paper, Department, Status, Request Date, Actions (Accept/Reject)
- Research (admin/super):
  - Tabs or filters: Active vs Archived
  - Table with papers in scope; Create (multipart), Edit (metadata), Delete, Archive/Unarchive
  - Filter by department (super admin)
  - Optional stats (counts)

---

## 16) Rationale for Design Choices (Opinionated)

- Monorepo: reduces drift, keeps contracts and docs with code, simplifies onboarding and CI.
- API returns nested objects: eliminates frontend lookups and reduces coupling to DB schema.
- Flyway over Hibernate DDL-auto: deterministic, auditable, and safe schema evolution.
- JWT (short TTL) + Google SSO: simple, industry standard; role-based checks server-side.
- Archive as orthogonal boolean: keeps lifecycle (status) separate from visibility (archived) and requestability.

---

## 17) Non-Functional Requirements

- Performance: List endpoints should handle typical pagination (size 20–50) with indexes present (departmentId, status, archived).
- Security: All access to files via API; rate limit request creation; strict CORS; HTTPS.
- Maintainability: Types live in one place; API contract stable; migrations tracked via Flyway.

---

## 18) Sample JSONs

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