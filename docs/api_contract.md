# Research Repository — API Contract (Authoritative)

**Base URL:** `http://localhost:8080` (dev)
**All endpoints:** prefixed with `/api`. Only `/api/auth/**` is public; everything else requires JWT.

---

## Conventions

- **Content-Type:** `application/json` unless `multipart/form-data` for uploads or file/binary download.
- **Timestamps:** ISO 8601 UTC, e.g., `2025-10-01T14:00:00Z`
- **Dates:** `YYYY-MM-DD`, e.g., `2025-09-15`
- **Pagination Response:**

```json
{
  "content": [ ... ],
  "totalElements": 123,
  "totalPages": 7,
  "number": 0,
  "size": 20
}
```

- **Authorization header:** `Authorization: Bearer <access_token>`
- **Error model (canonical):**

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "title", "message": "must not be blank" }],
  "traceId": "optional-correlation-id"
}
```

---

## Roles and Access Rules

| Role             | Paper Metadata             | Download/View                                   | CRUD | Request Approval | Archived Behavior                                            |
| ---------------- | -------------------------- | ----------------------------------------------- | ---- | ---------------- | ------------------------------------------------------------ |
| STUDENT          | Active papers only         | Only if ACCEPTED request and paper not archived | ❌   | ❌               | Cannot access archived                                       |
| TEACHER          | All papers (metadata only) | Only if ACCEPTED request and paper not archived | ❌   | ❌               | Sees metadata for archived, cannot request/download archived |
| DEPARTMENT_ADMIN | Papers in their department | Full access (active + archived)                 | ✅   | ✅               | Can archive/unarchive papers                                 |
| SUPER_ADMIN      | All papers                 | Full access                                     | ✅   | ✅               | Can archive/unarchive papers globally                        |

---

## Domain Types

```ts
type Role = "STUDENT" | "TEACHER" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
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
  filePath: string; // relative file path, e.g. '2023/dept_cs/paper_123.pdf'; full URL constructed dynamically by DTO/Mapper layer
  archived: boolean;
  archivedAt?: string | null;
}

interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // YYYY-MM-DD
  paper: ResearchPaper;
  requester: User;
}
```

---

## Authentication

The Refresh Token is **never** exposed in the JSON body. It is handled strictly via HTTP Cookies.

### POST /api/auth/google

- **Public.** Exchanges Google ID token for JWT access token and sets the refresh token cookie.

**Request:**

JSON

```
{ "code": "OAuthCode" }

```

**Responses:**

- **200 OK**
  - **Headers:** `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=2592000`
  - **Body:**

    JSON

    ```
    {
      "accessToken": "<jwt_token>",
      "user": {
        "userId": 1,
        "email": "alice@acdeducation.com",
        "fullName": "Alice Student",
        "role": "STUDENT",
        "department": null
      }
    }

    ```

- **400 INVALID_TOKEN**

  JSON

  ```
  { "error": "Invalid Google token", "code": "INVALID_TOKEN" }

  ```

- **403 DOMAIN_NOT_ALLOWED**

  JSON

  ```
  { "error": "Email domain not allowed", "code": "DOMAIN_NOT_ALLOWED" }

  ```

### POST /api/auth/refresh

- **Public.** Exchanges the cookie-based refresh token for a new access token and rotates the refresh token.
- **Requires `Cookie` header** containing the refresh token.

**Request:**

- **Headers:** `Cookie: refreshToken=<refresh_token>`
- **Body:** _(Empty)_

**Responses:**

- **200 OK**
  - **Headers:** `Set-Cookie: refreshToken=<new_refresh_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=2592000`
  - **Body:**

    JSON

    ```
    {
      "accessToken": "<new_jwt_token>"
    }

    ```

- **401 UNAUTHORIZED**
  - Occurs if the cookie is missing, expired, revoked, or if the token has already been used (due to network issues).

  JSON

  ```
  { "error": "Refresh token expired or missing", "code": "REFRESH_TOKEN_REVOKED" }

  ```

### POST /api/auth/logout

- **Public.** Logs the user out by revoking the refresh token in the DB and clearing the cookie in the browser.
- **Requires `Cookie` header.**

**Request:**

- **Headers:** `Cookie: refreshToken=<refresh_token>`
- **Body:** _(Empty)_

**Responses:**

- **200 OK**
  - **Headers:** `Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=0`
  - **Body:**

    JSON

    ```
    { "message": "Logged out successfully" }

    ```

**Notes:**

1.  **Rotation:** The old refresh token (from the request cookie) is invalidated. A new one is issued in the response `Set-Cookie` header.
2.  **Security:** The browser manages the cookie storage automatically. The frontend must **not** attempt to read or store this token manually.
3.  **Logout:** The `Max-Age=0` directive in the logout response forces the browser to delete the cookie immediately.

---

## Users

### GET /api/users/me

- Requires JWT
- Returns User object
- 401 if no JWT

---

## Filters

- `GET /api/filters/years` → number[]
- `GET /api/filters/departments` → Department[]
- `GET /api/filters/dates` → `{ minDate: string, maxDate: string }`

All require JWT. Students cannot filter by archived.

---

## Papers

### GET /api/papers

- JWT required
- Query params: `page`, `size`, `departmentId` (optional), `archived` (optional)
- **Student**: cannot use `archived` param → 403
- **Admin**: can filter by department and archived
- Response: paginated `ResearchPaper[]`

### GET /api/papers/{id}

- Admin: always 200 if exists
- Student:
  - Archived → 404
  - Active + ACCEPTED request → 200
  - Active + no request/denied → 404

- Teacher: 200 metadata only

---

## Student Requests

### GET /api/users/me/requests

- Returns all own requests for non-archived papers
- Available to STUDENT and TEACHER roles

### POST /api/requests

- Create new request
- Paper must exist and not be archived
- Duplicate → 409
- Response: `{ "requestId": number }`
- Available to STUDENT and TEACHER roles

---

## Admin Requests

### GET /api/admin/requests

- JWT required (DEPARTMENT_ADMIN / SUPER_ADMIN)
- `departmentId` optional for SUPER_ADMIN
- Returns `DocumentRequest[]` scoped to department

### PUT /api/admin/requests/{id}

- Body: `{ "action": "accept" | "reject" }`
- Must be PENDING
- Response: 204

---

## Admin Papers

- POST: create (multipart: `meta` JSON + `file`)
- PUT: update fields
- DELETE: delete
- PUT /archive and /unarchive: idempotent
- GET: list with filters + pagination

Server enforces:

- DEPARTMENT_ADMIN: department scope
- SUPER_ADMIN: global

---

## Files

### GET /api/files/{fileId}

- JWT required
- Constructs the file path from the paper's filePath field in the database
- Authorization matrix:
  - SUPER_ADMIN → always
  - DEPARTMENT_ADMIN → allowed if paper in department
  - STUDENT → allowed only if ACCEPTED request and paper not archived
  - TEACHER → allowed only if ACCEPTED request and paper not archived

- Returns binary, 403 or 404 otherwise

---

## Validation Rules

**Paper Create/Update**

- title, authorName: non-empty, ≤255
- abstractText: non-empty
- submissionDate: YYYY-MM-DD format
- departmentId: must exist
- file: PDF or DOCX ≤20MB

**DocumentRequest**

- paperId must exist, not archived
- Unique (userId, paperId)
- Approve/Reject: only PENDING

---

## Errors

- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 CONFLICT
- 413 PAYLOAD_TOO_LARGE
- 415 UNSUPPORTED_MEDIA_TYPE
- 500 INTERNAL_SERVER_ERROR
- Custom error codes:
  - REFRESH_TOKEN_REVOKED: Used when refresh token is expired

Canonical format applies.

---

## Statistics / Analytics

- `/api/admin/stats/requests` → request stats scoped by department
- `/api/admin/stats/research` → paper stats scoped by department

---

## State Machines

**Paper.archived**: `false → true` via /archive; `true → false` via /unarchive
**DocumentRequest.status**: `PENDING → ACCEPTED | REJECTED` (terminal)
