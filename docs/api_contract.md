# Research Repository — API Contract (Authoritative)

All payloads are JSON (camelCase)
Base URL (dev for now): http://localhost:8080
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
- Error model (canonical shape):

  ```json
  {
    "error": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "title", "message": "must not be blank" }],
    "traceId": "optional-correlation-id"
  }
  ```

  - error and code are REQUIRED
  - details and traceId are OPTIONAL

---

## Roles and Access Rules (server-enforced)

- STUDENT
  - Can read papers metadata (active by default, archived excluded)
  - Can create requests and view own requests
  - Can download/read files only if their request is ACCEPTED for that paper AND paper is not archived
- DEPARTMENT_ADMIN
  - Has department; can CRUD papers in their department
  - Can view and decide (ACCEPT/REJECT) requests for their department
  - Can archive/unarchive papers in their department
  - Can always download/view/read files for papers in their department (active or archived)
- SUPER_ADMIN
  - Basically the same as DEPARTMENT_ADMIN but;
  - No department; can manage everything across all departments
  - Can filter by department via query params where applicable

---

## Domain Types (API payloads)

```ts
type Role = "STUDENT" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
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
  fileUrl: string; // e.g., /api/files/<uuid>.pdf (gated)
  archived: boolean;
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

## Authentication

### POST /api/auth/google

Public. Exchanges a Google ID token for our JWT and returns the current user.

Request

```json
{ "code": "OAuthCode" }
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

## User

### GET /api/users/me

Requires JWT.

Responses

- 200 OK → User
- 401 UNAUTHORIZED

---

## Filters

### GET /api/filters/years

Requires JWT. Returns distinct years from research papers submission dates.

Responses

- 200 OK → number[] (e.g., [2021, 2022, 2023, 2024, 2025])
- 401 UNAUTHORIZED

### GET /api/filters/departments

Requires JWT. Returns all available departments.

Responses

- 200 OK → Department[]
- 401 UNAUTHORIZED

### GET /api/filters/dates

Requires JWT. Returns date options for filtering (min/max dates).

Query params

- type: string, optional, values: ["min", "max"], default: both

Responses

- 200 OK → {"minDate": "YYYY-MM-DD", "maxDate": "YYYY-MM-DD"}
- 401 UNAUTHORIZED

---

## Papers

### GET /api/papers

Requires JWT. Lists papers with pagination and optional filter.

Query params

- page: integer, default 0
- size: integer, default 20
- departmentId: integer (optional; all roles may filter)
- archived: boolean (optional)
  - Omitted → returns only archived=false (active) for all roles
  - If provided:
    - For admin roles: archived=true returns archived; archived=false returns active
    - For student role: providing archived param is forbidden → 403 FORBIDDEN

Responses

- 200 OK → Page<ResearchPaper>
- 401 UNAUTHORIZED
- 403 FORBIDDEN (student with archived param)

### GET /api/papers/{id}

Requires JWT.

Responses (authoritative policy)

- Admins: 200 OK → ResearchPaper (even if archived)
- Students:
  - If paper.archived=true → 404 NOT_FOUND (even with ACCEPTED request)
  - If paper not archived AND student has ACCEPTED request → 200 OK → ResearchPaper
- 404 NOT_FOUND (nonexistent)

---

## Student Requests

### GET /api/users/me/requests

Requires JWT (STUDENT).

Responses

- 200 OK → DocumentRequest[] (includes only non-archived papers and requests regardless of status)
- 403 FORBIDDEN

### POST /api/requests

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

## Admin Requests

### GET /api/admin/requests

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Query params

- departmentId: integer (optional; SUPER_ADMIN only)

Responses

- 200 OK → DocumentRequest[]

### PUT /api/admin/requests/{id}

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
- 409 CONFLICT (already decided)

---

## Admin Papers (CRUD + Archive)

### POST /api/admin/papers

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Content-Type: multipart/form-data

Parts

- meta: application/json (stringified JSON)
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
  {
    "paperId": 101,
    "title": "Quantum Cats",
    "authorName": "Jane Doe",
    "abstractText": "Feline quantum mechanics.",
    "department": { "departmentId": 2, "departmentName": "Physics" },
    "submissionDate": "2025-09-15",
    "fileUrl": "/api/files/abcd1234.pdf",
    "archived": false,
    "archivedAt": null
  }
  ```
- 400 VALIDATION_ERROR
- 403 FORBIDDEN
- 415 UNSUPPORTED_MEDIA_TYPE
- 413 PAYLOAD_TOO_LARGE

Server behavior

- archived defaults to false
- Stores file, generates fileUrl (e.g., /api/files/<uuid>.pdf)

### PUT /api/admin/papers/{id}

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request (JSON, all fields optional)

```json
{
  "title": "New Title",
  "authorName": "Jane Doe",
  "abstractText": "Updated abstract",
  "departmentId": 3,
  "submissionDate": "2025-09-20"
}
```

Responses

- 200 OK → updated ResearchPaper
- 400 VALIDATION_ERROR
- 403 FORBIDDEN
- 404 NOT_FOUND

### DELETE /api/admin/papers/{id}

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Responses

- 204 NO CONTENT
- 403 FORBIDDEN
- 404 NOT_FOUND

### PUT /api/admin/papers/{id}/archive

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request: none

Responses

- 204 NO CONTENT (idempotent)
- 403 FORBIDDEN
- 404 NOT_FOUND

### PUT /api/admin/papers/{id}/unarchive

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Request: none

Responses

- 204 NO CONTENT (idempotent)
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

## Files (gated download/view)

### GET /api/files/{fileIdOrName}

Requires JWT.

Headers

- Authorization: Bearer <jwt>

Query params

- none

Responses

- 200 OK (binary)
- 403 FORBIDDEN
- 404 NOT_FOUND

Authorization matrix

- SUPER_ADMIN: always allowed
- DEPARTMENT_ADMIN: allowed if paper.departmentId equals admin.departmentId (active or archived)
- STUDENT: allowed only if an ACCEPTED DocumentRequest exists for (userId, paperId) AND paper is not archived

Server must look up the owning paper by file identifier and enforce the above. No paperId query param is required or used.

---

## Validation Rules (key fields)

Create/Update Paper

- title: non-empty, max 255
- authorName: non-empty, max 255
- abstractText: non-empty
- submissionDate: ISO date (YYYY-MM-DD)
- departmentId: must exist
- file (create only): PDF or DOCX; size <= 20MB (configurable)
- multipart meta part must be application/json

Create Request

- paperId: must exist
- paper must be archived=false (else 404)
- Unique (userId, paperId) — duplicate → 409

Decide Request

- action: "accept" or "reject"
- request must be PENDING

---

## Error Responses

- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 CONFLICT
- 413 PAYLOAD_TOO_LARGE
- 415 UNSUPPORTED_MEDIA_TYPE
- 500 INTERNAL_SERVER_ERROR

All errors use the canonical error shape; details/traceId optional.

---

## Security & Auth Flow

- Frontend obtains Google credential (ID token) via Google Identity Services.
- Frontend POSTs /api/auth/google { token }.
- Backend verifies token and domain, upserts user, issues JWT (HS256).
- Frontend stores JWT (in-memory preferred for MVP) and calls GET /api/users/me to hydrate current user.
- Every subsequent API call includes Authorization: Bearer <jwt>.
- Server enforces RBAC and department scoping at service layer.
- JWT lifetime: ~60 minutes (configurable); re-auth to refresh.

---

## Statistics & Analytics API

### GET /api/admin/stats/requests

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Query params

- departmentId: integer (optional; SUPER_ADMIN only)

Responses

- 200 OK
  ```json
  {
    "totalRequests": 150,
    "pendingRequests": 25,
    "acceptedRequests": 100,
    "rejectedRequests": 25
  }
  ```
- 403 FORBIDDEN

Authorization matrix:

- DEPARTMENT_ADMIN: Returns stats for their department only
- SUPER_ADMIN: Returns global stats, with optional department filter via departmentId param

### /api/admin/stats/research

Requires JWT (DEPARTMENT_ADMIN or SUPER_ADMIN).

Query params

- departmentId: integer (optional; SUPER_ADMIN only)

Responses

- 200 OK
  ```json
  {
    "totalPapers": 85,
    "activePapers": 70,
    "archivedPapers": 15
  }
  ```
- 403 FORBIDDEN

Authorization matrix:

- DEPARTMENT_ADMIN: Returns stats for their department only
- SUPER_ADMIN: Returns global stats, with optional department filter via departmentId param

---

## State Machines (for clarity)

Paper.archived

- false → true (via /archive)
- true → false (via /unarchive)

DocumentRequest.status

- PENDING → ACCEPTED | REJECTED
- ACCEPTED/REJECTED → terminal
