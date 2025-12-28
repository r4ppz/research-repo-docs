# Research Repository — API Contract (Authoritative)

<!--toc:start-->

- [Research Repository — API Contract (Authoritative)](#research-repository-api-contract-authoritative)
  - [Conventions](#conventions)
  - [Error Handling](#error-handling)
    - [Canonical Error Response](#canonical-error-response)
      - [Field Semantics](#field-semantics)
      - [Contract Guarantees](#contract-guarantees)
    - [Error Code Registry](#error-code-registry)
    - [Security Considerations](#security-considerations)
  - [Roles and Access Rules](#roles-and-access-rules)
  - [Authentication](#authentication)
    - [POST /api/auth/google](#post-apiauthgoogle)
    - [POST /api/auth/refresh](#post-apiauthrefresh)
    - [POST /api/auth/logout](#post-apiauthlogout)
    - [GET /api/users/me](#get-apiusersme)
  - [Filters](#filters)
    - [GET /api/filters/years](#get-apifiltersyears)
    - [GET /api/filters/departments](#get-apifiltersdepartments)
  - [Papers](#papers)
    - [GET /api/papers](#get-apipapers)
    - [GET /api/papers/{id}](#get-apipapersid)
  - [Student/Teacher Requests](#studentteacher-requests)
    - [GET /api/users/me/requests](#get-apiusersmerequests)
    - [POST /api/requests](#post-apirequests)
    - [DELETE /api/requests/{requestId}](#delete-apirequestsrequestid)
  - [Admin Requests](#admin-requests)
    - [GET /api/admin/requests](#get-apiadminrequests)
    - [PUT /api/admin/requests/{id}](#put-apiadminrequestsid)
  - [Admin Papers](#admin-papers)
  - [Files](#files)
    - [GET /api/files/{fileId}](#get-apifilesfileid)
  - [Validation Rules](#validation-rules)
  - [Statistics / Analytics](#statistics-analytics)
  - [State Machines](#state-machines)
  <!--toc:end-->

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

---

## Error Handling

### Canonical Error Response

All error responses **MUST** conform to this structure:

```json
{
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

#### Field Semantics

| Field     | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `code`    | string | Yes      | Machine-readable error code (see Error Code Registry)      |
| `message` | string | Yes      | User-safe, localized-ready error message                   |
| `details` | array  | No       | Structured validation errors (for `VALIDATION_ERROR` only) |
| `traceId` | string | No       | Correlation ID for log lookup and support                  |

#### Contract Guarantees

1. `code` is **always present** and stable across versions
2. `message` is **always user-safe** (no stack traces, SQL errors, or file paths)
3. `details` is **structured** (array of `{field, message}` objects, never free-form strings)
4. Frontend **MUST route on `code`** for logic; `message` MAY be used for display purposes

---

### Error Code Registry

| HTTP | Code                   | Category | Meaning                                                         |
| ---- | ---------------------- | -------- | --------------------------------------------------------------- |
| 400  | VALIDATION_ERROR       | Input    | Field-level validation failed                                   |
| 400  | INVALID_REQUEST        | Input    | Malformed JSON or missing required fields                       |
| 401  | UNAUTHENTICATED        | Auth     | Missing or invalid JWT access token                             |
| 401  | REFRESH_TOKEN_REVOKED  | Auth     | Refresh token is invalid, expired, or revoked                   |
| 403  | ACCESS_DENIED          | AuthZ    | User lacks required role or department scope                    |
| 403  | DOMAIN_NOT_ALLOWED     | Auth     | Email domain not in whitelist                                   |
| 404  | RESOURCE_NOT_FOUND     | Data     | Resource does not exist (or user cannot know it exists)         |
| 404  | RESOURCE_NOT_AVAILABLE | Data     | Resource exists but is archived/inaccessible                    |
| 409  | DUPLICATE_REQUEST      | Business | Active request (PENDING/ACCEPTED) already exists for this paper |
| 409  | REQUEST_ALREADY_FINAL  | Business | Cannot modify request in terminal state                         |
| 413  | FILE_TOO_LARGE         | Upload   | File exceeds 20MB limit                                         |
| 415  | UNSUPPORTED_MEDIA_TYPE | Upload   | File is not PDF or DOCX                                         |
| 429  | RATE_LIMIT_EXCEEDED    | System   | Too many requests in time window                                |
| 500  | INTERNAL_ERROR         | System   | Unhandled server error                                          |
| 500  | FILE_STORAGE_ERROR     | System   | File missing on disk or I/O failure                             |
| 503  | SERVICE_UNAVAILABLE    | System   | Database or external service down                               |

---

### Security Considerations

1. **Information Leakage Prevention**
   - `RESOURCE_NOT_AVAILABLE` (archived papers) returns HTTP 404, not 403, to prevent enumeration
   - Students receive identical 404 responses for non-existent papers and papers they cannot access
   - Error messages never reveal internal paths, SQL queries, or stack traces
   - `traceId` is opaque and cannot be used to infer system state
   - All refresh token failures return identical generic messages

2. **Defensive Error Handling**
   - All unhandled exceptions are caught by global exception handler and mapped to `INTERNAL_ERROR`
   - Stack traces are logged server-side but never included in API response
   - Database constraint violations are mapped to appropriate business error codes
   - File path traversal attempts are caught and return `INVALID_REQUEST`

3. **Rate Limiting Errors**
   - HTTP 429 responses include `Retry-After` header (seconds)
   - `details. retryAfter` provides same value in JSON for easier frontend handling
   - Frontend **MUST** disable submission during retry window

4. **Audit Requirements**
   - All `FILE_STORAGE_ERROR` occurrences must trigger monitoring alerts
   - All `INTERNAL_ERROR` responses must be logged with full stack trace server-side
   - All authentication failures (`UNAUTHENTICATED`, `REFRESH_TOKEN_REVOKED`) must be logged for security monitoring
   - Rate limit violations should be logged for abuse detection

---

## Roles and Access Rules

| Role             | Department | Can View Metadata                               | Can Download/View PDF                           | Can CRUD Papers             | Can Approve/Reject Requests                 |
| ---------------- | ---------- | ----------------------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| STUDENT          | null       | All non-archived papers, all departments        | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| TEACHER          | null       | All papers, including archived, all departments | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| DEPARTMENT_ADMIN | Required   | All papers, including archived, all departments | Full for their department                       | Full for their department   | Approve/reject requests in their department |
| SUPER_ADMIN      | null       | All papers, including archived, all departments | Full across all departments                     | Full across all departments | Full across all departments                 |

**Note:** This table describes homepage behavior (`/` route, `/api/papers` endpoint). For admin-specific pages and endpoints (`/api/admin/*`), DEPARTMENT_ADMIN operations are scoped to their assigned department only. See Admin Papers and Admin Requests sections for department-scoped behavior.

---

## Authentication

The Refresh Token is **never** exposed in the JSON body. It is handled strictly via HTTP Cookies.

### POST /api/auth/google

- **Public. ** Exchanges Google ID token for JWT access token and sets the refresh token cookie.

**Request:**

```json
{ "code": "OAuthCode" }
```

**Responses:**

- **200 OK**
  - **Headers:** `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=2592000`
  - **Body:**

    ```json
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

  ```json
  {
    "code": "INVALID_TOKEN",
    "message": "Authentication failed",
    "traceId": "..."
  }
  ```

- **403 DOMAIN_NOT_ALLOWED**

  ```json
  {
    "code": "DOMAIN_NOT_ALLOWED",
    "message": "Email domain not allowed",
    "traceId": "..."
  }
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

    ```json
    {
      "accessToken": "<new_jwt_token>"
    }
    ```

- **401 UNAUTHORIZED**
  - Occurs if the cookie is missing, expired, revoked, or if the token has already been used.

  ```json
  {
    "code": "REFRESH_TOKEN_REVOKED",
    "message": "Refresh token expired or missing",
    "traceId": "..."
  }
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

    ```json
    { "message": "Logged out successfully" }
    ```

**Notes:**

1. **Rotation:** The old refresh token (from the request cookie) is invalidated. A new one is issued in the response `Set-Cookie` header.
2. **Security:** The browser manages the cookie storage automatically. The frontend must **not** attempt to read or store this token manually.
3. **Logout:** The `Max-Age=0` directive in the logout response forces the browser to delete the cookie immediately.

### GET /api/users/me

- Requires JWT
- Returns User object
- **401 UNAUTHENTICATED** if no JWT

---

## Filters

### GET /api/filters/years

- **Authentication:** JWT required
- **Response:** `{ "years": number[] }` - An object containing array of years

**Authorization Scoping:**

- **STUDENT**: Only years with non-archived papers (all departments)
- **TEACHER**: All years with papers, including archived (all departments)
- **DEPARTMENT_ADMIN**: All years with papers, including archived (all departments)
- **SUPER_ADMIN**: All years with papers, including archived (all departments)

**Response Example:**

```json
{
  "years": [2025, 2024, 2023, 2022]
}
```

**Notes:**

- Returns years in descending order (newest first)
- Empty array if no papers exist within user's scope
- Years are extracted from paper `submissionDate` field
- Frontend may filter displayed options based on page context (e.g., show only user's department years on admin pages using auth context)

---

### GET /api/filters/departments

- **Authentication:** JWT required
- **Response:** `{ "departments": Department[] }` - An object containing array of departments

**Authorization Scoping:**

- **STUDENT**: All departments (all departments)
- **TEACHER**: All departments (all departments)
- **DEPARTMENT_ADMIN**: All departments (all departments)
- **SUPER_ADMIN**: All departments (all departments)

**Response Example:**

```json
{
  "departments": [
    { "departmentId": 1, "departmentName": "Computer Science" },
    { "departmentId": 2, "departmentName": "Mathematics" },
    { "departmentId": 3, "departmentName": "Physics" }
  ]
}
```

**Notes:**

- Only includes departments that have at least one paper within user's scope
- Empty array if no departments have accessible papers
- Frontend may filter displayed options based on page context (e.g., show only user's department on admin pages using auth context)

---

## Papers

### GET /api/papers

- **Authentication:** JWT required
- **Response:** Paginated `ResearchPaper[]`

**Query Parameters:**

| Parameter      | Type   | Required | Description                                                                 |
| -------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `page`         | number | No       | Zero-indexed page number (default: 0)                                       |
| `size`         | number | No       | Results per page (default: 20, max: 100)                                    |
| `search`       | string | No       | Full-text search across title, author name, and abstract (case-insensitive) |
| `departmentId` | string | No       | Comma-separated list of department IDs (multiselect)                        |
| `year`         | string | No       | Comma-separated list of by submission year (multiselect)                    |
| `archived`     | string | No       | Filter archived status: "true" or "false" (Admin-only)                      |
| `sortBy`       | string | No       | Sort field: `submissionDate` (default), `title`, `authorName`               |
| `sortOrder`    | string | No       | Sort direction: `desc` (default), `asc`                                     |

**Search Behavior:**

- **Case-insensitive** matching across `title`, `authorName`, and `abstractText` fields
- **SQL injection protection:** All search terms are parameterized
- **Empty search:** Returns all papers within user's scope (no filtering applied)
- **Special characters:** Handled safely; wildcards are not supported
- **Partial matching:** Searches for substring matches (e.g., "machine" matches "Machine Learning")
- **Note:** Field names follow API camelCase convention; backend maps to database snake_case fields (`author_name`, `abstract_text`)

**Authorization Scoping:**

| Role             | Scope                                           | Can Use `archived` Param |
| ---------------- | ----------------------------------------------- | ------------------------ |
| STUDENT          | Non-archived papers only (all departments)      | ❌ (403 ACCESS_DENIED)   |
| TEACHER          | All papers including archived (all departments) | ❌ (403 ACCESS_DENIED)   |
| DEPARTMENT_ADMIN | All papers (all departments)                    | ✅                       |
| SUPER_ADMIN      | All papers (all departments)                    | ✅                       |

**Important:** DEPARTMENT_ADMIN department scoping applies **only** to `/api/admin/papers` and `/api/admin/requests` endpoints, not to `/api/papers`. This endpoint always returns papers from all departments for DEPARTMENT_ADMIN, matching the homepage behavior.

**Response Example:**

```json
{
  "content": [
    {
      "paperId": 123,
      "title": "Machine Learning in Healthcare",
      "authorName": "Dr. Jane Smith",
      "abstractText": "This paper explores the application of machine learning.. .",
      "department": {
        "departmentId": 1,
        "departmentName": "Computer Science"
      },
      "submissionDate": "2023-09-15",
      "filePath": "2023/dept_cs/paper_123.pdf",
      "archived": false,
      "archivedAt": null
    }
  ],
  "totalElements": 45,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

**Error Codes:**

| Condition                             | HTTP | Code            | Message                                                          |
| ------------------------------------- | ---- | --------------- | ---------------------------------------------------------------- |
| Student/Teacher uses `archived` param | 403  | ACCESS_DENIED   | "You do not have permission to filter by archived status"        |
| Invalid `sortBy` value                | 400  | INVALID_REQUEST | "Invalid sort field. Must be: submissionDate, title, authorName" |
| Invalid `sortOrder` value             | 400  | INVALID_REQUEST | "Invalid sort order. Must be: asc, desc"                         |
| Invalid `year` format                 | 400  | INVALID_REQUEST | "Invalid year format. Must be a 4-digit year (e.g., 2023)"       |
| Invalid `departmentId` format         | 400  | INVALID_REQUEST | "Invalid department ID format"                                   |
| Invalid `page` or `size`              | 400  | INVALID_REQUEST | "Invalid pagination parameters"                                  |

**Security Considerations:**

- **SQL injection prevention:** All parameters are properly escaped and parameterized
- **Enumeration attack prevention:** Students receive identical responses for non-existent and inaccessible papers
- **Role-based filtering:** Backend enforces role-specific scoping regardless of client-provided parameters
- **Department ID validation:** Invalid department IDs are rejected with 400 error

### GET /api/papers/{id}

- See endpoint-specific error codes above for detailed behavior

---

## Student/Teacher Requests

### GET /api/users/me/requests

- Returns all own requests for non-archived papers
- Available to STUDENT and TEACHER roles

### POST /api/requests

- Create new request
- Paper must exist and not be archived
- Only one PENDING or ACCEPTED request allowed per user/paper (enforced by database partial unique index) → **409 DUPLICATE_REQUEST**
- Response: `{ "requestId": number }`
- Available to STUDENT and TEACHER roles

### DELETE /api/requests/{requestId}

- Deletes a user's own request (allows re-requesting after rejection)
- Only available for REJECTED requests or PENDING requests created by the same user
- Response: 204 No Content
- Available to STUDENT and TEACHER roles (for their own requests)

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

- POST: create (multipart upload with two parts: `metadata` as stringified JSON and `file`)
  - `metadata`: Form field containing raw stringified JSON with paper details (title, authorName, abstractText, departmentId)
  - `file`: PDF or DOCX file upload
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

- Returns binary, 403 or 404 otherwise (see endpoint-specific error codes)

---

## Validation Rules

**Paper Create/Update**

- title: non-empty (up to database TEXT limit)
- authorName: non-empty, ≤255
- abstractText: non-empty
- submissionDate: YYYY-MM-DD format
- departmentId: must exist
- file: PDF or DOCX ≤20MB

**DocumentRequest**

- paperId must exist, not archived
- Only one PENDING or ACCEPTED request allowed per user/paper (no duplicate active requests) - enforced by database partial unique index
- Users can create new requests after previous ones are REJECTED
- Approve/Reject: only PENDING
- Attempting to create duplicate PENDING/ACCEPTED request → **409 DUPLICATE_REQUEST**

---

## Statistics / Analytics

- `/api/admin/stats/requests` → request stats scoped by department
- `/api/admin/stats/research` → paper stats scoped by department

---

## State Machines

**Paper. archived**: `false → true` via /archive; `true → false` via /unarchive
**DocumentRequest.status**: `PENDING → ACCEPTED | REJECTED` (terminal)
