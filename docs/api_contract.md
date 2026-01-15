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
    - [GET /api/papers/{paperId}/my-request](#get-apipaperspaperidmy-request)
  - [Student/Teacher Requests](#studentteacher-requests)
    - [GET /api/users/me/requests](#get-apiusersmerequests)
    - [POST /api/requests](#post-apirequests)
    - [DELETE /api/requests/{requestId}](#delete-apirequestsrequestid)
  - [Admin Requests](#admin-requests)
    - [GET /api/admin/requests](#get-apiadminrequests)
    - [PUT /api/admin/requests/{requestId}/accept](#put-apiadminrequestsrequestidaccept)
    - [PUT /api/admin/requests/{requestId}/reject](#put-apiadminrequestsrequestidreject)
  - [Admin Papers (CRUD)](#admin-papers-crud)
    - [GET /api/admin/papers](#get-apiadminpapers)
    - [GET /api/admin/papers/{id}](#get-apiadminpapersid)
    - [POST /api/admin/papers](#post-apiadminpapers)
    - [PUT /api/admin/papers/{id}](#put-apiadminpapersid)
    - [PUT /api/admin/papers/{id}/archive](#put-apiadminpapersidarchive)
    - [PUT /api/admin/papers/{id}/unarchive](#put-apiadminpapersidunarchive)
    - [DELETE /api/admin/papers/{id}](#delete-apiadminpapersid)
    - [Admin Papers Error Registry](#admin-papers-error-registry)
  - [Files](#files)
    - [GET /api/files/{fileId}](#get-apifilesfileid)
  - [Validation Rules](#validation-rules)
  - [Statistics / Analytics](#statistics-analytics)
  - [State Machines](#state-machines)
  <!--toc:end-->

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

- **Public.** Exchanges Google ID token for JWT access token and sets the refresh token cookie.

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

- **Authentication:** JWT required
- **Path Parameter:** `id` (number) — Paper ID
- **Response:** `ResearchPaper` object
- **Authorization Scoping:**
  - **STUDENT:** Only non-archived papers, all departments
  - **TEACHER:** All papers, including archived, all departments
  - **DEPARTMENT_ADMIN:** All papers, including archived, all departments
  - **SUPER_ADMIN:** All papers, including archived, all departments

**Error Codes:**

| Condition                                  | HTTP | Code               | Message            |
| ------------------------------------------ | ---- | ------------------ | ------------------ |
| Paper does not exist or inaccessible       | 404  | RESOURCE_NOT_FOUND | "Paper not found"  |
| Paper is archived (student/teacher access) | 404  | RESOURCE_NOT_FOUND | "Paper not found"  |
| Invalid paper ID format                    | 400  | INVALID_REQUEST    | "Invalid paper ID" |

**Security:** Students/teachers receive identical 404 for non-existent and inaccessible/archived papers.

### GET /api/papers/{paperId}/my-request

- Returns the current user's request for the specified paper, if it exists.
- Available to STUDENT and TEACHER roles.

- **Request:**
- Method: GET
- Path parameter: `paperId` (integer, required)
- No request body.

- **Response:**

  ```json
  {
    "requestId": 42,
    "status": "PENDING",
    "createdAt": "2024-06-01T12:00:00Z",
    "updatedAt": "2024-06-01T12:00:00Z"
  }
  ```

- **Errors:**
  - 404 RESOURCE_NOT_FOUND (no request for this paper/user)
  - 401 UNAUTHENTICATED

---

## Student/Teacher Requests

### GET /api/users/me/requests

Retrieve a paginated and filterable list of requests created by the authenticated user.

- **Authentication:** JWT Required (`STUDENT` or `TEACHER`).
- **Authorization:** Users can only see their own requests.
- **Query Parameters:**

| Parameter   | Type   | Required | Description                                                     |
| ----------- | ------ | -------- | --------------------------------------------------------------- |
| `page`      | number | No       | Zero-indexed page number (default: 0).                          |
| `size`      | number | No       | Results per page (default: 20, max: 100).                       |
| `status`    | string | No       | Filter by request status: `PENDING`, `ACCEPTED`, or `REJECTED`. |
| `search`    | string | No       | Partial match against `paper.title` or `paper.authorName`.      |
| `sortBy`    | string | No       | Sort field: `createdAt` (default), `paper.title`, or `status`.  |
| `sortOrder` | string | No       | Sort direction: `desc` (default) or `asc`.                      |

- **Response (200 OK):**

```json
{
  "content": [
    {
      "requestId": 42,
      "status": "PENDING",
      "createdAt": "2024-06-01T12:00:00Z",
      "updatedAt": "2024-06-01T12:00:00Z",
      "paper": {
        "paperId": 123,
        "title": "Machine Learning in Healthcare",
        "authorName": "Dr. Jane Smith",
        "abstractText": "This paper explores the application of machine learning...",
        "department": {
          "departmentId": 1,
          "departmentName": "Computer Science"
        },
        "submissionDate": "2023-09-15",
        "filePath": "2023/dept_cs/paper_123.pdf",
        "archived": false,
        "archivedAt": null
      }
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

- **Notes:**
- **Archived Papers:** This endpoint **MUST NOT** return requests for papers where `archived: true`. If a paper is archived after a request is made, that request is hidden from this list to prevent information leakage.
- **Metadata:** Includes the full `paper` and nested `department` objects to allow the frontend to render the card/row without secondary API calls.

- **Error Codes:**

| Condition             | HTTP | Code              | Message                                                  |
| --------------------- | ---- | ----------------- | -------------------------------------------------------- |
| Missing/Invalid JWT   | 401  | `UNAUTHENTICATED` | "Authentication required"                                |
| Invalid status filter | 400  | `INVALID_REQUEST` | "Invalid status. Must be PENDING, ACCEPTED, or REJECTED" |
| Invalid sort field    | 400  | `INVALID_REQUEST` | "Invalid sort field"                                     |

---

### POST /api/requests

Create a new access request for a research paper.

- **Request Body:**

```json
{
  "paperId": 123
}
```

- **Constraints:**
- Only one active (`PENDING` or `ACCEPTED`) request allowed per user/paper.
- Users can only request access to non-archived papers.

- **Response (201 Created):**

```json
{
  "requestId": 42,
  "status": "PENDING"
}
```

- **Errors:**
- `404 RESOURCE_NOT_FOUND`: Paper does not exist or is archived.
- `409 DUPLICATE_REQUEST`: An active request already exists for this paper.

---

### DELETE /api/requests/{requestId}

Cancel a `PENDING` request or remove a `REJECTED` request from the user's history.

- **Authorization:** Returns `404 RESOURCE_NOT_FOUND` if the request does not belong to the user (security through obscurity).
- **Constraints:** `ACCEPTED` requests cannot be deleted (they must be revoked by an Admin or the paper must be archived).
- **Response:** `204 No Content`

---

## Admin Requests

### GET /api/admin/requests

Retrieve a paginated and filterable list of document access requests.

- **Authentication:** JWT required.
- **Roles:** `DEPARTMENT_ADMIN` (restricted to own department) or `SUPER_ADMIN` (global access).

**Request Query Parameters**

| Parameter      | Type   | Required | Description                                                                                                        |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `page`         | number | No       | Zero-indexed page number (default: 0).                                                                             |
| `size`         | number | No       | Results per page (default: 20, max: 100).                                                                          |
| `search`       | string | No       | Case-insensitive partial match against `user.fullName`, `user.email`, or `paper.title`.                            |
| `status`       | string | No       | Filter by status: `PENDING`, `ACCEPTED`, or `REJECTED`. Supports comma-separated lists (e.g., `PENDING,ACCEPTED`). |
| `departmentId` | string | No       | **SUPER_ADMIN only.** Filter by specific department ID. Must be rejected with 400 for `DEPARTMENT_ADMIN`.          |
| `sortBy`       | string | No       | Sort field: `createdAt` (default), `status`, `paper.title`, or `user.fullName`.                                    |
| `sortOrder`    | string | No       | Sort direction: `desc` (default) or `asc`.                                                                         |

**Response Body (200 OK)**

The response uses the canonical pagination format with fully expanded user and paper objects to prevent secondary API round-trips.

```json
{
  "content": [
    {
      "requestId": 42,
      "status": "PENDING",
      "createdAt": "2024-06-01T12:00:00Z",
      "updatedAt": "2024-06-01T12:00:00Z",
      "user": {
        "userId": 100,
        "email": "student@acdeducation.com",
        "fullName": "Jane Doe",
        "role": "STUDENT"
      },
      "paper": {
        "paperId": 123,
        "title": "Neural Network Efficiency",
        "authorName": "Dr. Smith",
        "abstractText": "This paper discusses...",
        "department": {
          "departmentId": 1,
          "departmentName": "Computer Science"
        },
        "submissionDate": "2023-09-15",
        "filePath": "2023/dept_cs/paper_123.pdf",
        "archived": false,
        "archivedAt": null
      }
    }
    // ... more requests
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

**Authorization & Security Rules**

- **Department Scoping:** `DEPARTMENT_ADMIN` access is strictly scoped to their assigned department. The backend must automatically append `WHERE paper.department_id = user.department_id` to the query.
- **Information Concealment:** Attempts by a `DEPARTMENT_ADMIN` to query or search for requests outside their department must return `403 ACCESS_DENIED`.
- **Status Transitions:** Only `PENDING` requests may be modified. `ACCEPTED` and `REJECTED` are terminal states.

**Error Codes**

| Condition                            | HTTP | Code              | Message                                                            |
| ------------------------------------ | ---- | ----------------- | ------------------------------------------------------------------ |
| Missing/Invalid JWT                  | 401  | `UNAUTHENTICATED` | "Authentication required".                                         |
| Cross-department access              | 403  | `ACCESS_DENIED`   | "You do not have permission to view requests for this department". |
| Admin attempts `departmentId` filter | 400  | `INVALID_REQUEST` | "departmentId filter not permitted for your role".                 |
| Invalid status value                 | 400  | `INVALID_REQUEST` | "Invalid status. Must be PENDING, ACCEPTED, or REJECTED".          |

### PUT /api/admin/requests/{requestId}/accept

Approve a pending document access request. Sets the status from `PENDING` to `ACCEPTED`. Only `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` can perform this operation.

- **Authentication:** JWT required.
- **Authorization:**
  - `DEPARTMENT_ADMIN` may only approve requests for papers within their assigned department.
  - `SUPER_ADMIN` may approve any request.

- **Path Parameter:**
  - `requestId` (integer, required): ID of the document request.

- **Request Body:**

  ```json
  {}
  ```

  _(Empty body. All necessary info is in the path and user context.)_

- **Business Rules:**
  - Only requests with `status: "PENDING"` can be approved.
  - Approving sets the request's status to `ACCEPTED` and updates `updatedAt`.
  - Cannot approve requests outside the admin’s department (`DEPARTMENT_ADMIN`).
  - Cannot approve requests for archived papers (should not be possible via normal UI, enforced for safety).
  - Side effect: Grants user access to download/view the corresponding paper.

- **Response (200 OK):**

  ```json
  {
    "requestId": 42,
    "status": "ACCEPTED",
    "createdAt": "2024-06-01T12:00:00Z",
    "updatedAt": "2024-06-02T14:00:00Z",
    "user": {
      "userId": 100,
      "email": "student@acdeducation.com",
      "fullName": "Jane Doe",
      "role": "STUDENT"
    },
    "paper": {
      "paperId": 123,
      "title": "Neural Network Efficiency",
      "authorName": "Dr. Smith",
      "abstractText": "This paper discusses...",
      "department": {
        "departmentId": 1,
        "departmentName": "Computer Science"
      },
      "submissionDate": "2023-09-15",
      "filePath": "2023/dept_cs/paper_123.pdf",
      "archived": false,
      "archivedAt": null
    }
  }
  ```

- **Error Codes:**

| Condition                             | HTTP | Code                    | Message                                                               |
| ------------------------------------- | ---- | ----------------------- | --------------------------------------------------------------------- |
| Request does not exist                | 404  | `RESOURCE_NOT_FOUND`    | "Request not found"                                                   |
| Request not `PENDING`                 | 409  | `REQUEST_ALREADY_FINAL` | "Request is already in a terminal state"                              |
| Not authorized for this department    | 403  | `ACCESS_DENIED`         | "You do not have permission to approve requests for this department." |
| Missing/invalid JWT                   | 401  | `UNAUTHENTICATED`       | "Authentication required."                                            |
| Non-admin role                        | 403  | `ACCESS_DENIED`         | "Admin privileges required."                                          |
| Request for archived or missing paper | 404  | `RESOURCE_NOT_FOUND`    | "Paper not found"                                                     |

- **Notes:**
  - Status transition is idempotent. If called on a request already in terminal state (`ACCEPTED`, `REJECTED`), an error is returned.
  - All state transitions are audit-logged (timestamp, admin user, old/new status).

---

### PUT /api/admin/requests/{requestId}/reject

Reject a pending document access request. Sets the status from `PENDING` to `REJECTED`. Only `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` can perform this operation.

- **Authentication:** JWT required.
- **Authorization:**
  - `DEPARTMENT_ADMIN` may only reject requests for papers within their assigned department.
  - `SUPER_ADMIN` may reject any request.

- **Path Parameter:**
  - `requestId` (integer, required): ID of the document request.

- **Request Body:**

  ```json
  {
    "reason": "Insufficient justification" // (Optional, string, max 255 chars)
  }
  ```

  _(Optional: `reason` may be omitted; if provided, it will be recorded and returned in the response)_

- **Business Rules:**
  - Only requests with `status: "PENDING"` can be rejected.
  - Rejecting sets the request's status to `REJECTED`, updates `updatedAt`, and stores an optional rejection reason.
  - Cannot reject requests outside the admin’s department (`DEPARTMENT_ADMIN`).
  - Cannot reject requests for archived papers.
  - Once rejected, the user loses eligibility to download/view the full document.

- **Response (200 OK):**

  ```json
  {
    "requestId": 42,
    "status": "REJECTED",
    "reason": "Insufficient justification",
    "createdAt": "2024-06-01T12:00:00Z",
    "updatedAt": "2024-06-02T14:30:00Z",
    "user": {
      "userId": 100,
      "email": "student@acdeducation.com",
      "fullName": "Jane Doe",
      "role": "STUDENT"
    },
    "paper": {
      "paperId": 123,
      "title": "Neural Network Efficiency",
      "authorName": "Dr. Smith",
      "abstractText": "This paper discusses...",
      "department": {
        "departmentId": 1,
        "departmentName": "Computer Science"
      },
      "submissionDate": "2023-09-15",
      "filePath": "2023/dept_cs/paper_123.pdf",
      "archived": false,
      "archivedAt": null
    }
  }
  ```

- **Error Codes:**

| Condition                             | HTTP | Code                    | Message                                                              |
| ------------------------------------- | ---- | ----------------------- | -------------------------------------------------------------------- |
| Request does not exist                | 404  | `RESOURCE_NOT_FOUND`    | "Request not found"                                                  |
| Request not `PENDING`                 | 409  | `REQUEST_ALREADY_FINAL` | "Request is already in a terminal state"                             |
| Not authorized for this department    | 403  | `ACCESS_DENIED`         | "You do not have permission to reject requests for this department." |
| Missing/invalid JWT                   | 401  | `UNAUTHENTICATED`       | "Authentication required."                                           |
| Non-admin role                        | 403  | `ACCESS_DENIED`         | "Admin privileges required."                                         |
| Request for archived or missing paper | 404  | `RESOURCE_NOT_FOUND`    | "Paper not found"                                                    |
| Reason exceeds max length             | 400  | `VALIDATION_ERROR`      | "Reason must be at most 255 characters."                             |

- **Notes:**
  - The `reason` field is optional, max 255 chars, stored in the backend if provided, and included in rejection notification to the user.
  - If status transition is attempted on a request already in terminal state (`ACCEPTED`, `REJECTED`), error `409 REQUEST_ALREADY_FINAL` is returned.
  - All state transitions are audit-logged (timestamp, admin user, old/new status, and rejection reason).

---

## Admin Papers (CRUD)

### GET /api/admin/papers

Retrieve a paginated list of all research papers for administrative management. This view includes archived papers and enforces strict department-level isolation for `DEPARTMENT_ADMIN` roles.

- **Authentication:** JWT Required (`DEPARTMENT_ADMIN` or `SUPER_ADMIN`)
- **Authorization Scoping:**
- **DEPARTMENT_ADMIN:** Backend strictly enforces `WHERE department_id = user.dept_id`. Attempts to bypass this via query parameters must be ignored or rejected.
- **SUPER_ADMIN:** Full global access.

**Query Parameters:**

| Parameter   | Type    | Required | Description                                                        |
| ----------- | ------- | -------- | ------------------------------------------------------------------ |
| `page`      | number  | No       | Zero-indexed page number (default: 0).                             |
| `size`      | number  | No       | Results per page (default: 20, max: 100).                          |
| `search`    | string  | No       | Full-text search across `title`, `authorName`, and `abstractText`. |
| `archived`  | boolean | No       | Filter by archived status (true/false). If omitted, returns both.  |
| `sortBy`    | string  | No       | `submissionDate` (default), `title`, `authorName`.                 |
| `sortOrder` | string  | No       | `desc` (default), `asc`.                                           |

**Request Example:**
`GET /api/admin/papers?page=0&size=10&search=Quantum&archived=false&sortBy=title&sortOrder=asc`

**Response Body (200 OK):**

```json
{
  "content": [
    {
      "paperId": 123,
      "title": "Quantum Computing Trends",
      "authorName": "Dr. Aris Thorne",
      "abstractText": "Detailed exploration of qubits and error correction...",
      "department": {
        "departmentId": 1,
        "departmentName": "Computer Science"
      },
      "submissionDate": "2025-12-01",
      "filePath": "2025/dept_1/paper_123.pdf",
      "archived": false,
      "archivedAt": null
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 10
}
```

**Error Codes:**

| Condition               | HTTP | Code              | Message                     |
| ----------------------- | ---- | ----------------- | --------------------------- |
| Missing/Invalid JWT     | 401  | `UNAUTHENTICATED` | "Authentication required"   |
| Non-admin role          | 403  | `ACCESS_DENIED`   | "Admin privileges required" |
| Invalid pagination/sort | 400  | `INVALID_REQUEST` | "Invalid query parameters"  |

---

### GET /api/admin/papers/{id}

Retrieve a single paper object for administrative purposes (e.g., viewing details or pre-filling an edit form).

- **Authentication:** JWT Required (`DEPARTMENT_ADMIN` or `SUPER_ADMIN`)
- **Authorization Rules:**
- **DEPARTMENT_ADMIN:** `403 ACCESS_DENIED` if paper is outside their department.
- **SUPER_ADMIN:** Full access.

- **Response (200 OK):**

```json
{
  "paperId": 123,
  "title": "Quantum Computing Trends",
  "authorName": "Dr. Aris Thorne",
  "abstractText": "Detailed exploration of...",
  "department": {
    "departmentId": 1,
    "departmentName": "Computer Science"
  },
  "submissionDate": "2025-12-01",
  "filePath": "2025/dept_1/paper_123.pdf",
  "archived": false,
  "archivedAt": null
}
```

---

### POST /api/admin/papers

Create a new paper and upload its file. This uses `multipart/form-data`.

- **Authentication:** JWT Required
- **Content-Type:** `multipart/form-data`
- **Request Parts:**
- `metadata`: Stringified JSON.

```json
{
  "title": "Impact of AI in Ethics",
  "authorName": "Sarah Jenkins",
  "abstractText": "This research analyzes...",
  "departmentId": 1,
  "submissionDate": "2025-11-20"
}
```

- `file`: The binary PDF or DOCX file (Max 20MB).

- **Enforcement:** `DEPARTMENT_ADMIN` must provide a `departmentId` matching their own; otherwise, return `403 ACCESS_DENIED`.
- **Response (201 Created):** Returns the newly created `ResearchPaper` object.

---

### PUT /api/admin/papers/{id}

Update the metadata of an existing paper. **Note:** To update the physical file, the user must delete and re-create the paper (standard MVP behavior).

- **Authentication:** JWT Required
- **Request Body:**

```json
{
  "title": "Updated Title",
  "authorName": "Updated Author",
  "abstractText": "Updated abstract content...",
  "departmentId": 1,
  "submissionDate": "2025-11-21"
}
```

- **Authorization:** `DEPARTMENT_ADMIN` cannot update papers belonging to other departments.
- **Response (200 OK):** Returns the updated `ResearchPaper` object.

---

### PUT /api/admin/papers/{id}/archive

### PUT /api/admin/papers/{id}/unarchive

Idempotent endpoints to toggle paper visibility.

- **Authentication:** JWT Required
- **Logic:** Sets `archived` flag and `archivedAt` timestamp.
- **Response (200 OK):**

```json
{
  "paperId": 123,
  "archived": true,
  "archivedAt": "2025-10-01T14:00:00Z"
}
```

---

### DELETE /api/admin/papers/{id}

Permanently delete a paper and its associated file.

- **Authentication:** JWT Required
- **Process:** 1. Verify department ownership.

2. Delete database record.
3. Delete physical file from filesystem.

- **Response:** `204 No Content`

---

### Admin Papers Error Registry

| Condition                            | HTTP | Code                     | Message                                              |
| ------------------------------------ | ---- | ------------------------ | ---------------------------------------------------- |
| Create/Update for wrong department   | 403  | `ACCESS_DENIED`          | "You can only manage papers within your department." |
| File uploaded is not PDF/DOCX        | 415  | `UNSUPPORTED_MEDIA_TYPE` | "Only PDF and DOCX files are allowed."               |
| Metadata JSON is malformed           | 400  | `INVALID_REQUEST`        | "The metadata part must be valid JSON."              |
| Required field missing (e.g., title) | 400  | `VALIDATION_ERROR`       | "Title is required."                                 |
| Physical file cannot be saved        | 500  | `FILE_STORAGE_ERROR`     | "Internal storage failure while saving file."        |

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
