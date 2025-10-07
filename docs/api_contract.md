# Research Repository — API Contract (V1 Authoritative)

Version: 2025-10-07  
Audience: Backend + Frontend  
Status: V1 — First version. If backend deviates, fix backend. If frontend deviates, fix frontend.

All payloads are JSON (camelCase) unless explicitly noted.  
Base URL (dev): http://localhost:8080  
All endpoints are prefixed with /api. Only /api/auth/\*\* is public; everything else requires JWT.

---

## Conventions

- Content-Type: application/json unless multipart/form-data for uploads or file/binary download.
- Timestamps: ISO 8601 UTC, e.g., 2025-10-01T14:00:00Z
- Dates (no time): YYYY-MM-DD, e.g., 2025-09-15
- Pagination response:
  ```json
  {
    "content": [ ... ],
    "totalElements": 123,
    "totalPages": 7,
    "number": 0,
    "size": 20
  }
  ```
- Authorization header: Authorization: Bearer <jwt>
- Error model (always this shape):
  ```json
  {
    "error": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "title", "message": "must not be blank" }],
    "traceId": "optional-correlation-id"
  }
  ```

---

## Roles and Access Rules (server-enforced)

- STUDENT
  - Can read papers metadata (active by default, archived excluded)
  - Can create requests and view own requests
  - Can download files only if their request is ACCEPTED for that paper (even if that paper later becomes archived)
- DEPARTMENT_ADMIN
  - Has department; can CRUD papers in their department
  - Can view and decide (ACCEPT/REJECT) requests for their department
  - Can archive/unarchive papers in their department
  - Can always download/view files for papers in their department (active or archived)
- SUPER_ADMIN
  - No department; can manage everything across all departments
  - Can filter by department via query params where applicable

---

## Domain Types (API payloads)

```ts
type Role = "STUDENT" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
type PaperStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

interface Department {
  departmentId: number;
  departmentName: string;
}

interface User {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  department: Department | null;
}

interface ResearchPaper {
  paperId: number;
  title: string;
  authorName: string;
  abstractText: string;
  department: Department;
  submissionDate: string; // YYYY-MM-DD
  status: PaperStatus;
  fileUrl: string;
  archived: boolean;
  archivedAt?: string | null;
}

interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string;
  paper: ResearchPaper;
  requester: User;
}
```

---

## 1) Authentication

### 1.1 POST /api/auth/google

Public. Exchanges a Google ID token for our JWT and returns the current user.

Request

```json
{ "token": "GOOGLE_ID_TOKEN" }
```

Responses

- 200 OK
  ```json
  {
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 1,
      "email": "alice@acdeducation.com",
      "fullName": "Alice Student",
      "role": "STUDENT",
      "department": null
    }
  }
  ```
- 400 INVALID_TOKEN
  ```json
  { "error": "Invalid Google token", "code": "INVALID_TOKEN" }
  ```
- 403 DOMAIN_NOT_ALLOWED
  ```json
  { "error": "Email domain not allowed", "code": "DOMAIN_NOT_ALLOWED" }
  ```

Notes

- Backend must verify signature, audience (clientId), issuer, expiry, and enforce acdeducation.com domain.

---

## 2) User

### 2.1 GET /api/users/me

Requires JWT.

Responses

- 200 OK → User
- 401 UNAUTHORIZED

---

## 3) Departments

### 3.1 GET /api/departments

Requires JWT.

Responses

- 200 OK → Department[]

---

## 4) Papers

### 4.1 GET /api/papers

Requires JWT. Lists papers with pagination and optional filter.

Query params

- page: integer, default 0
- size: integer, default 20
- departmentId: integer (optional)
- archived: boolean (optional)
  - Omitted → returns only archived=false (active) for all roles
  - If provided:
    - For admin roles: archived=true returns archived; archived=false returns active
    - For student role: providing archived param is forbidden (403)

Responses

- 200 OK → Page<ResearchPaper>

### 4.2 GET /api/papers/{id}

Requires JWT.

Responses

- 200 OK → ResearchPaper (admins can fetch even if archived)
- Students:
  - If archived and student has no ACCEPTED request: 404
  - If student has ACCEPTED request: may return 200 so their Requests page can render; alternatively the Requests endpoint embeds the paper. Pick one consistent policy.
- 404 NOT_FOUND

---

## 5) Student Requests

### 5.1 GET /api/users/me/requests

Requires JWT (STUDENT).

Responses

- 200 OK → DocumentRequest[]
- 403 FORBIDDEN

### 5.2 POST /api/requests

Requires JWT (STUDENT).

Request

```json
{ "paperId": 101 }
```

Responses

- 201 CREATED
  ```json
  { "requestId": 555 }
  ```
- 400 VALIDATION_ERROR
- 404 NOT_FOUND (paper doesn’t exist OR paper is archived)
- 409 CONFLICT (duplicate for this user+paper)

---

## 6) Admin Requests

### 6.1 GET /api/admin/requests

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Query params

- departmentId: integer (optional; SUPER_ADMIN only)

Responses

- 200 OK → DocumentRequest[]

### 6.2 PUT /api/admin/requests/{id}

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request

```json
{ "action": "accept" } // or "reject"
```

Responses

- 204 NO CONTENT
- 400 VALIDATION_ERROR
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 CONFLICT

---

## 7) Admin Papers (CRUD + Archive)

### 7.1 POST /api/admin/papers

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Content-Type: multipart/form-data

Parts

- meta: text/plain (stringified JSON)
  ```json
  {
    "title": "Quantum Cats",
    "authorName": "Jane Doe",
    "abstractText": "Feline quantum mechanics.",
    "departmentId": 2,
    "submissionDate": "2025-09-15"
  }
  ```
- file: application/pdf (or docx)

Responses

- 201 CREATED
  ```json
  { "paperId": 101 }
  ```
- 400 VALIDATION_ERROR
- 403 FORBIDDEN
- 415 UNSUPPORTED_MEDIA_TYPE
- 413 PAYLOAD_TOO_LARGE

### 7.2 PUT /api/admin/papers/{id}

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request (JSON, all fields optional)

```json
{
  "title": "New Title",
  "authorName": "Jane Doe",
  "abstractText": "Updated abstract",
  "departmentId": 3,
  "submissionDate": "2025-09-20",
  "status": "APPROVED"
}
```

Responses

- 200 OK → updated ResearchPaper
- 400 VALIDATION_ERROR
- 403 FORBIDDEN
- 404 NOT_FOUND

### 7.3 DELETE /api/admin/papers/{id}

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Responses

- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND

### 7.4 PUT /api/admin/papers/{id}/archive

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request: none

Responses

- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND

### 7.5 PUT /api/admin/papers/{id}/unarchive

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request: none

Responses

- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND

### 7.6 GET /api/admin/papers

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Query params

- page: integer, default 0
- size: integer, default 20
- departmentId: integer (optional; SUPER_ADMIN only)
- archived: boolean, default false

Responses

- 200 OK → Page<ResearchPaper>

---

## 8) Files (gated download/view)

### 8.1 GET /api/files/{filename}?paperId={id}

Requires JWT.

Headers

- Authorization: Bearer <jwt>

Responses

- 200 OK (binary)
- 403 FORBIDDEN
- 404 NOT_FOUND

Authorization matrix

- SUPER_ADMIN: always allowed
- DEPARTMENT_ADMIN: allowed if paper.departmentId equals admin.departmentId (active or archived)
- STUDENT: allowed only if an ACCEPTED DocumentRequest exists for (userId, paperId), even if archived

---

## 9) Validation Rules (key fields)

Create/Update Paper

- title: non-empty, max 255
- authorName: non-empty, max 255
- abstractText: non-empty
- submissionDate: ISO date (YYYY-MM-DD)
- departmentId: must exist
- status: one of SUBMITTED, APPROVED, REJECTED (update only)
- file (create only): PDF or DOCX; size <= 20MB (configurable)

Create Request

- paperId: must exist
- paper must be archived=false (else 404)
- Unique (userId, paperId) — duplicate → 409

Decide Request

- action: "accept" or "reject"
- request must be PENDING

---

## 10) Error Responses

- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 CONFLICT
- 413 PAYLOAD_TOO_LARGE
- 415 UNSUPPORTED_MEDIA_TYPE
- 500 INTERNAL_SERVER_ERROR

---

## 11) Security & Auth Flow

- Frontend obtains Google credential (ID token) via Google Identity Services.
- Frontend POSTs /api/auth/google { token }.
- Backend verifies token and domain, upserts user, issues JWT (HS256).
- Frontend stores JWT (in-memory preferred for MVP) and calls GET /api/users/me to hydrate current user.
- Every subsequent API call includes Authorization: Bearer <jwt>.
- Server enforces RBAC and department scoping at service layer.

---

## 12) cURL Examples (developer sanity)

Login (exchange Google token)

```bash
curl -X POST http://localhost:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{ "token": "GOOGLE_ID_TOKEN" }'
```

Get current user

```bash
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $JWT"
```

List active papers

```bash
curl "http://localhost:8080/api/papers?page=0&size=20&departmentId=2" \
  -H "Authorization: Bearer $JWT"
```

Admin: list archived papers

```bash
curl "http://localhost:8080/api/admin/papers?archived=true&page=0&size=20&departmentId=2" \
  -H "Authorization: Bearer $JWT"
```

Create student request (will fail if paper archived)

```bash
curl -X POST http://localhost:8080/api/requests \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{ "paperId": 101 }'
```

Admin: archive and unarchive paper

```bash
curl -X PUT http://localhost:8080/api/admin/papers/101/archive \
  -H "Authorization: Bearer $JWT"

curl -X PUT http://localhost:8080/api/admin/papers/101/unarchive \
  -H "Authorization: Bearer $JWT"
```

File download (gated; student needs ACCEPTED request)

```bash
curl -L "http://localhost:8080/api/files/abcd1234.pdf?paperId=101" \
  -H "Authorization: Bearer $JWT" --output Quantum_Cats.pdf
```

---

## 13) State Machines (for clarity)

Paper.status

- SUBMITTED → APPROVED | REJECTED
- APPROVED → (optional) REJECTED or stay APPROVED
- REJECTED → (optional) APPROVED if re-reviewed

Paper.archived

- false → true (via /archive)
- true → false (via /unarchive)
- Independent of status

DocumentRequest.status

- PENDING → ACCEPTED | REJECTED
- ACCEPTED/REJECTED → terminal

---

Build to this contract. If you deviate, document and approve before code changes.
