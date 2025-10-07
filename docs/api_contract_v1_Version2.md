# Research Repository — API Contract (Authoritative)

Version: 2025-10-07  
Audience: Backend + Frontend  
Status: FINAL — Build exactly to this. If backend deviates, fix backend. If frontend deviates, fix frontend.

This document defines every public API: authentication, authorization rules, request/response shapes, error formats, and flow. All payloads are JSON (camelCase) unless explicitly noted.

Base URL (dev): http://localhost:8080  
All endpoints are prefixed with /api. Only /api/auth/** is public; everything else requires JWT.

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
    "details": [
      { "field": "title", "message": "must not be blank" }
    ],
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

These shapes are returned by API and used by frontend as-is. No IDs-only.

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
  department: Department | null; // student/super: null; dept admin: object
}

interface ResearchPaper {
  paperId: number;
  title: string;
  authorName: string;
  abstractText: string;
  department: Department;
  submissionDate: string; // YYYY-MM-DD
  status: PaperStatus;    // default SUBMITTED on create
  fileUrl: string;        // e.g., /api/files/uuid.pdf
  archived: boolean;      // NEW
  archivedAt?: string | null; // ISO datetime
}

interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // ISO datetime
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
{
  "token": "GOOGLE_ID_TOKEN"
}
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
- On success: upsert user (default role STUDENT), then issue JWT.
- JWT claims: sub (userId), email, fullName, role, deptId (nullable), iss, iat, exp.

---

## 2) User

### 2.1 GET /api/users/me
Requires JWT. Returns the authenticated user.

Headers
- Authorization: Bearer <jwt>

Responses
- 200 OK
  ```json
  {
    "userId": 1,
    "email": "alice@acdeducation.com",
    "fullName": "Alice Student",
    "role": "STUDENT",
    "department": null
  }
  ```
- 401 UNAUTHORIZED
  ```json
  { "error": "Missing or invalid token", "code": "UNAUTHORIZED" }
  ```

---

## 3) Departments

### 3.1 GET /api/departments
Requires JWT. Returns all departments.

Responses
- 200 OK
  ```json
  [
    { "departmentId": 1, "departmentName": "Information Technology" },
    { "departmentId": 2, "departmentName": "Business Administration" }
  ]
  ```

---

## 4) Papers (metadata; file access is gated elsewhere)

### 4.1 GET /api/papers
Requires JWT. Lists papers with pagination and optional filter.

Query params
- page: integer, default 0
- size: integer, default 20 (max 100)
- departmentId: integer (optional, filter by department)
- archived: boolean (optional)
  - Omitted (default) → returns only archived=false (active) for all roles
  - If provided:
    - For admin roles: archived=true returns archived papers; archived=false returns active
    - For student role: providing `archived` is forbidden; returns 403

Responses
- 200 OK
  ```json
  {
    "content": [
      {
        "paperId": 101,
        "title": "Quantum Cats",
        "authorName": "Jane Doe",
        "abstractText": "Feline quantum mechanics.",
        "department": { "departmentId": 2, "departmentName": "Physics" },
        "submissionDate": "2025-09-15",
        "status": "APPROVED",
        "fileUrl": "/api/files/abcd1234.pdf",
        "archived": false,
        "archivedAt": null
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    "number": 0,
    "size": 20
  }
  ```

Notes
- Default student view shows active (archived=false) only.
- Admins can toggle archived via query param or use the admin-specific endpoint below.

### 4.2 GET /api/papers/{id}
Requires JWT. Returns a single paper.

Responses
- 200 OK → ResearchPaper (admins can fetch even if archived)
- Students:
  - If archived and student has no ACCEPTED request: 404 NOT_FOUND
  - If student has ACCEPTED request: may return 200 so their Requests page can render; alternatively the Requests endpoint embeds the paper. Follow one consistent policy.
- 404 NOT_FOUND
  ```json
  { "error": "Paper not found", "code": "NOT_FOUND" }
  ```

---

## 5) Student Requests

### 5.1 GET /api/users/me/requests
Requires JWT (STUDENT). Returns requests for the current user.

Responses
- 200 OK
  ```json
  [
    {
      "requestId": 1,
      "status": "PENDING",
      "requestDate": "2025-10-01T14:00:00Z",
      "paper": { "...": "ResearchPaper (may be archived)" },
      "requester": { "...": "User" }
    }
  ]
  ```
- 403 FORBIDDEN (if non-student calls it)
  ```json
  { "error": "Forbidden", "code": "FORBIDDEN" }
  ```

### 5.2 POST /api/requests
Requires JWT (STUDENT). Creates a new document access request.

Request
```json
{ "paperId": 101 }
```

Responses
- 201 CREATED
  - Location: /api/requests/{id}
  ```json
  { "requestId": 555 }
  ```
- 400 VALIDATION_ERROR (missing/invalid paperId)
- 404 NOT_FOUND (paper doesn’t exist OR paper is archived — to avoid leaking archived content)
- 409 CONFLICT (duplicate: request already exists for this user+paper)
  ```json
  { "error": "Request already exists", "code": "CONFLICT" }
  ```

Notes
- State machine: PENDING → ACCEPTED or REJECTED
- Idempotency: a second create for the same (user, paper) returns 409.

---

## 6) Admin Requests (triage)

### 6.1 GET /api/admin/requests
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Lists requests to triage.

Query params
- departmentId: integer (optional; SUPER_ADMIN can filter; DEPARTMENT_ADMIN value is ignored/overridden by their own department)

Responses
- 200 OK
  ```json
  [
    {
      "requestId": 1,
      "status": "PENDING",
      "requestDate": "2025-10-01T14:00:00Z",
      "paper": { "...": "ResearchPaper" },
      "requester": { "...": "User" }
    }
  ]
  ```

Authorization rules
- DEPARTMENT_ADMIN sees only requests for papers in their department.
- SUPER_ADMIN sees all; optional departmentId narrows scope.

### 6.2 PUT /api/admin/requests/{id}
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Decide a request.

Request
```json
{ "action": "accept" }
```
or
```json
{ "action": "reject" }
```

Responses
- 204 NO CONTENT
- 400 VALIDATION_ERROR (invalid action)
- 403 FORBIDDEN (admin not authorized for this paper’s department)
- 404 NOT_FOUND (request not found)
- 409 CONFLICT (already decided)

State machine
- Only PENDING can transition to ACCEPTED or REJECTED. No further changes after decision.

---

## 7) Admin Papers (CRUD + Archive)

### 7.1 POST /api/admin/papers
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Create a new paper with file upload.

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
  - Location: /api/papers/{paperId}
  ```json
  { "paperId": 101 }
  ```
- 400 VALIDATION_ERROR (missing fields, bad date)
- 403 FORBIDDEN (dept admin uploading to another department)
- 415 UNSUPPORTED_MEDIA_TYPE (bad file type)
- 413 PAYLOAD_TOO_LARGE (file too large, e.g., >20MB)

Server behavior
- status defaults to SUBMITTED
- archived defaults to false
- Stores file, generates fileUrl (e.g., /api/files/<uuid>.pdf)

### 7.2 PUT /api/admin/papers/{id}
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Update paper metadata (no file here).

Request (JSON, all fields optional; only provided fields are updated)
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
- 403 FORBIDDEN (not allowed for this department)
- 404 NOT_FOUND

Notes
- SUPER_ADMIN can change departmentId
- DEPARTMENT_ADMIN cannot move a paper out of their department

### 7.3 DELETE /api/admin/papers/{id}
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Deletes paper and file.

Responses
- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND

### 7.4 PUT /api/admin/papers/{id}/archive
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Archive a paper (idempotent).

Request: none

Responses
- 204 NO CONTENT
- 403 FORBIDDEN (wrong department)
- 404 NOT_FOUND
- Optional 409 CONFLICT if already archived (recommended to be idempotent and still 204)

Effects
- Sets archived=true, archivedAt=now()
- Optional: auto-reject all PENDING requests for this paper with reason “ARCHIVED” (recommended)

### 7.5 PUT /api/admin/papers/{id}/unarchive
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Unarchive a paper (idempotent).

Request: none

Responses
- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND
- Optional 409 CONFLICT if already unarchived (recommended to be idempotent and still 204)

Effects
- Sets archived=false, archivedAt=null

### 7.6 GET /api/admin/papers
Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN). Admin listing with archived filter.

Query params
- page: integer, default 0
- size: integer, default 20
- departmentId: integer (optional; SUPER_ADMIN only; DEPARTMENT_ADMIN is implicitly scoped)
- archived: boolean, default false

Responses
- 200 OK → Page<ResearchPaper>

---

## 8) Files (gated download/view)

### 8.1 GET /api/files/{filename}?paperId={id}
Requires JWT. Returns the file binary. Authorization enforced.

Headers
- Authorization: Bearer <jwt>

Responses
- 200 OK
  - Content-Type: application/pdf (or relevant type)
  - Content-Disposition: inline; filename="Quantum_Cats.pdf" (or attachment; filename=...)
  - Binary body
- 403 FORBIDDEN
  ```json
  { "error": "Forbidden", "code": "FORBIDDEN" }
  ```
- 404 NOT_FOUND (missing or mismatched filename/paperId)

Authorization matrix
- SUPER_ADMIN: always allowed
- DEPARTMENT_ADMIN: allowed if paper.departmentId equals admin.departmentId (active or archived)
- STUDENT: allowed only if an ACCEPTED DocumentRequest exists for (userId, paperId), even if archived

Notes
- Frontend always uses the `paper.fileUrl` returned by paper payloads (do not construct paths manually).
- paperId query param required to validate access linkage (defense-in-depth).

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

## 10) Standard Errors

- 400 VALIDATION_ERROR
  ```json
  {
    "error": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "title", "message": "must not be blank" }
    ]
  }
  ```
- 401 UNAUTHORIZED
  ```json
  { "error": "Missing or invalid token", "code": "UNAUTHORIZED" }
  ```
- 403 FORBIDDEN
  ```json
  { "error": "Forbidden", "code": "FORBIDDEN" }
  ```
- 404 NOT_FOUND
  ```json
  { "error": "Resource not found", "code": "NOT_FOUND" }
  ```
- 409 CONFLICT
  ```json
  { "error": "Duplicate request", "code": "CONFLICT" }
  ```
- 413 PAYLOAD_TOO_LARGE
  ```json
  { "error": "File too large", "code": "PAYLOAD_TOO_LARGE" }
  ```
- 415 UNSUPPORTED_MEDIA_TYPE
  ```json
  { "error": "Unsupported media type", "code": "UNSUPPORTED_MEDIA_TYPE" }
  ```
- 500 INTERNAL_SERVER_ERROR
  ```json
  { "error": "Unexpected server error", "code": "INTERNAL" }
  ```

---

## 11) Security & Auth Flow

- Frontend obtains Google credential (ID token) via Google Identity Services.
- Frontend POSTs /api/auth/google { token }.
- Backend verifies token and domain, upserts user, issues JWT (HS256).
- Frontend stores JWT (in-memory preferred for MVP) and calls GET /api/users/me to hydrate current user.
- Every subsequent API call includes Authorization: Bearer <jwt>.
- Server enforces RBAC and department scoping at service layer.

JWT claims (example)
```json
{
  "iss": "acd-research",
  "sub": "1",
  "email": "alice@acdeducation.com",
  "fullName": "Alice Student",
  "role": "STUDENT",
  "deptId": null,
  "iat": 1696666666,
  "exp": 1696670266
}
```

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

Admin: decide request
```bash
curl -X PUT http://localhost:8080/api/admin/requests/555 \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{ "action": "accept" }'
```

Admin: create paper (multipart)
```bash
curl -X POST http://localhost:8080/api/admin/papers \
  -H "Authorization: Bearer $JWT" \
  -F 'meta={"title":"Quantum Cats","authorName":"Jane Doe","abstractText":"...","departmentId":2,"submissionDate":"2025-09-15"};type=application/json' \
  -F "file=@/path/to/file.pdf;type=application/pdf"
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

## 14) Pagination & Limits

- page: 0-based index
- size: default 20, max 100; values >100 coerced to 100
- Rate-limiting (recommended):
  - POST /api/requests: 10/minute per user (429 Too Many Requests)
  - POST /api/auth/google: 30/minute per IP

429 example
```json
{ "error": "Too many requests", "code": "RATE_LIMITED", "retryAfterSeconds": 60 }
```

---

## 15) OpenAPI/Swagger (recommended)

Expose Swagger UI at /swagger-ui.html and JSON at /v3/api-docs.  
The OpenAPI must reflect this contract exactly (schemas, responses, error model, security).

---

Build the backend to this contract; build the frontend assuming these exact shapes and rules. No surprises, no refactors.