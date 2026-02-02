# Research Repository — API Contract

> NOTE: This has been newly improved REST API contract. It is still under review.

## Conventions

- **Content-Type:** `application/json` unless `multipart/form-data` for uploads or file/binary download.
- **Timestamps:** ISO 8601 UTC, e.g., `2025-10-01T14:00:00Z`
- **Dates:** `YYYY-MM-DD`, e.g., `2025-09-15`
- **Authorization header:** `Authorization: Bearer <access_token>`

### Canonical Pagination Response

```json
{
  "content": [ ... ],
  "totalElements": 123,
  "totalPages": 7,
  "number": 0,
  "size": 20
}
```

---

## Error Handling

### Canonical Error Response

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

- **`code`** is always present and stable across versions.
- **`message`** is always user-safe (no stack traces, SQL errors, or file paths).
- **`details`** is structured (array of `{field, message}` objects, never free-form strings).
- Frontend **MUST** route on `code` for logic; `message` **MAY** be used for display purposes.

---

### Error Code Registry

| HTTP | Code                   | Category | Meaning                                                 |
| ---- | ---------------------- | -------- | ------------------------------------------------------- |
| 400  | VALIDATION_ERROR       | Input    | Field-level validation failed                           |
| 400  | INVALID_REQUEST        | Input    | Malformed JSON or missing required fields               |
| 401  | UNAUTHENTICATED        | Auth     | Missing or invalid JWT access token                     |
| 401  | REFRESH_TOKEN_REVOKED  | Auth     | Refresh token is invalid, expired, or revoked           |
| 403  | ACCESS_DENIED          | AuthZ    | User lacks required role or department scope            |
| 403  | DOMAIN_NOT_ALLOWED     | Auth     | Email domain not in whitelist                           |
| 404  | RESOURCE_NOT_FOUND     | Data     | Resource does not exist (or user cannot know it exists) |
| 404  | RESOURCE_NOT_AVAILABLE | Data     | Resource exists but is archived/inaccessible            |
| 404  | FILE_NOT_FOUND         | System   | Physical file is missing from storage                   |
| 409  | DUPLICATE_REQUEST      | Business | Active request already exists for this paper            |
| 409  | REQUEST_ALREADY_FINAL  | Business | Cannot modify request in terminal state                 |
| 413  | FILE_TOO_LARGE         | Upload   | File exceeds 20MB limit                                 |
| 415  | UNSUPPORTED_MEDIA_TYPE | Upload   | File is not PDF or DOCX                                 |
| 429  | RATE_LIMIT_EXCEEDED    | System   | Too many requests in time window                        |
| 500  | INTERNAL_ERROR         | System   | Unhandled server error                                  |
| 500  | FILE_STORAGE_ERROR     | System   | File missing on disk or I/O failure                     |
| 503  | SERVICE_UNAVAILABLE    | System   | Database or external service down                       |

---

## Security Considerations

### Information Leakage Prevention

- `RESOURCE_NOT_AVAILABLE` (archived papers) returns HTTP 404, not 403, to prevent enumeration.
- Students receive identical 404 responses for non-existent papers and papers they cannot access.
- Error messages never reveal internal paths, SQL queries, or stack traces.
- `traceId` is opaque and cannot be used to infer system state.
- All refresh token failures return identical generic messages.

### Defensive Error Handling

- All unhandled exceptions are caught by a global exception handler and mapped to `INTERNAL_ERROR`.
- Stack traces are logged server-side but never included in API responses.
- Database constraint violations are mapped to appropriate business error codes.
- File path traversal attempts are caught and return `INVALID_REQUEST`.

### Rate Limiting Errors

- Rate limiting is enforced at the proxy layer (e.g., API gateway or reverse proxy).
- When the proxy returns HTTP 429 it **SHOULD** include a `Retry-After` header (seconds).
- Rate limiting is handled at the proxy layer; the backend application does not emit 429 for request throttling.
- Frontend **MUST** disable submission during the retry window when receiving 429.

### Audit Requirements

- All `FILE_STORAGE_ERROR` occurrences must trigger monitoring alerts.
- All `INTERNAL_ERROR` responses must be logged with full stack trace server-side.
- All authentication failures (`UNAUTHENTICATED`, `REFRESH_TOKEN_REVOKED`) must be logged for security monitoring.
- Rate limit violations should be logged for abuse detection.

---

## Roles and Access Rules

| Role             | Department | Can View Metadata                               | Can Download/View PDF                           | Can CRUD Papers             | Can Approve/Reject Requests                 |
| ---------------- | ---------- | ----------------------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| STUDENT          | null       | All non-archived papers, all departments        | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| TEACHER          | null       | All papers, including archived, all departments | Only if request ACCEPTED and paper not archived | No                          | No                                          |
| DEPARTMENT_ADMIN | Required   | All papers, including archived, all departments | Full for their department                       | Full for their department   | Approve/reject requests in their department |
| SUPER_ADMIN      | null       | All papers, including archived, all departments | Full across all departments                     | Full across all departments | Full across all departments                 |

**Note:** This table describes homepage behavior (`/` route, `/api/papers` endpoint). For admin-specific pages and endpoints (`/api/admin/*`), `DEPARTMENT_ADMIN` operations are scoped to their assigned department only. See Admin Papers and Admin Requests sections for department-scoped behavior.

---

## Authentication

- **Refresh Token:** never exposed in JSON body; handled strictly via HTTP cookies.

### POST /api/auth/google

**Purpose:** Exchange Google ID token for JWT access token and set refresh token cookie.
**Access:** Public.

**Request Body**

```json
{ "code": "OAuthCode" }
```

**Responses**

- **200 OK**

    **Headers**

    ```
    Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=2592000
    ```

    **Body**

    ```json
    {
        "accessToken": "<jwt_token>",
        "user": {
            "userId": 1,
            "email": "alice@acdeducation.com",
            "fullName": "Alice Student",
            "role": "STUDENT",
            "department": null,
            "profilePictureUrl": "https://lh3.googleusercontent.com/a/default-user=s96-c"
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

---

### POST /api/auth/refresh

**Purpose:** Exchange cookie-based refresh token for a new access token and rotate refresh token.
**Access:** Public (no `Authorization` header required) but requires `refreshToken` cookie.

**Request**

- **Headers:** `Cookie: refreshToken=<refresh_token>`
- **Body:** _(Empty)_

**Responses**

- **200 OK**

    **Headers**

    ```
    Set-Cookie: refreshToken=<new_refresh_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=2592000
    ```

    **Body**

    ```json
    {
        "accessToken": "<new_jwt_token>"
    }
    ```

- **401 UNAUTHORIZED**

    ```json
    {
        "code": "REFRESH_TOKEN_REVOKED",
        "message": "Refresh token expired or missing",
        "traceId": "..."
    }
    ```

**Notes**

- The browser attaches the `refreshToken` cookie automatically; frontend must not read or store it manually.
- The old refresh token is invalidated when rotated.

---

### POST /api/auth/logout

**Purpose:** Revoke refresh token and clear cookie.
**Access:** Public (no `Authorization` header required) but requires `refreshToken` cookie.

**Request**

- **Headers:** `Cookie: refreshToken=<refresh_token>`
- **Body:** _(Empty)_

**Responses**

- **200 OK**

    **Headers**

    ```
    Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/; Max-Age=0
    ```

    **Body**

    ```json
    { "message": "Logged out successfully" }
    ```

**Notes**

- `Max-Age=0` forces the browser to delete the cookie immediately.
- Frontend must not attempt to read or store the refresh token manually.

---

### GET /api/users/me

**Purpose:** Return current authenticated user profile.
**Authentication:** JWT required.
**Authorization:** All authenticated users.

**Response (200 OK)**

```json
{
    "userId": 1,
    "email": "alice@acdeducation.com",
    "fullName": "Alice Student",
    "role": "STUDENT",
    "department": null,
    "profilePictureUrl": "https://lh3.googleusercontent.com/a/default-user=s96-c"
}
```

#### Field Descriptions

| Field               | Type   | Description                                                        |
| ------------------- | ------ | ------------------------------------------------------------------ |
| `userId`            | number | Unique identifier for the user                                     |
| `email`             | string | User's email (verified by Google SSO)                              |
| `fullName`          | string | User's full name from Google profile                               |
| `role`              | string | User role: `STUDENT`, `TEACHER`, `DEPARTMENT_ADMIN`, `SUPER_ADMIN` |
| `department`        | object | Department info (only for `DEPARTMENT_ADMIN`, otherwise null)      |
| `profilePictureUrl` | string | Google profile picture URL (nullable)                              |

**Errors**

- **403 ACCESS_DENIED** if user lacks required permissions.
- **401 UNAUTHENTICATED** if no JWT or token is invalid.

---

## Filters

### GET /api/filters/years

**Purpose:** Return list of years for filter UI.
**Authentication:** JWT required.
**Response:** `{ "years": number[] }`

**Authorization Scoping**

| Role             | Scope                                                       |
| ---------------- | ----------------------------------------------------------- |
| STUDENT          | Only years with non-archived papers (all departments)       |
| TEACHER          | All years with papers, including archived (all departments) |
| DEPARTMENT_ADMIN | All years with papers, including archived (all departments) |
| SUPER_ADMIN      | All years with papers, including archived (all departments) |

**Response Example**

```json
{
    "years": [2025, 2024, 2023, 2022]
}
```

**Notes**

- Years returned in descending order (newest first).
- Empty array if no papers exist within user's scope.
- Years are extracted from paper `submissionDate` field.

---

### GET /api/filters/departments

**Purpose:** Return list of departments for filter UI.
**Authentication:** JWT required.
**Response:** `{ "departments": Department[] }`

**Authorization Scoping**

- All roles: same behavior — returns departments that have at least one paper within user's scope.

**Response Example**

```json
{
    "departments": [
        { "departmentId": 1, "departmentName": "Computer Science" },
        { "departmentId": 2, "departmentName": "Mathematics" },
        { "departmentId": 3, "departmentName": "Physics" }
    ]
}
```

**Notes**

- Only includes departments that have at least one paper within user's scope.
- Empty array if no departments have accessible papers.

---

## Papers

### GET /api/papers

**Purpose:** Retrieve paginated list of `ResearchPaper[]`.
**Authentication:** JWT required.
**Response:** Canonical pagination object with `ResearchPaper` items.

#### Query Parameters

| Parameter      | Type   | Required | Description                                                                 |
| -------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `page`         | number | No       | Zero-indexed page number (default: 0)                                       |
| `size`         | number | No       | Results per page (default: 20, max: 100)                                    |
| `search`       | string | No       | Full-text search across title, author name, and abstract (case-insensitive) |
| `departmentId` | string | No       | Comma-separated list of department IDs (multiselect)                        |
| `year`         | string | No       | Comma-separated list by submission year (multiselect)                       |
| `archived`     | string | No       | Filter archived status: "true" or "false" (Admin-only)                      |
| `sortBy`       | string | No       | Sort field: `submissionDate` (default), `title`, `authorName`               |
| `sortOrder`    | string | No       | Sort direction: `desc` (default), `asc`                                     |

#### Search Behavior

- Case-insensitive matching across `title`, `authorName`, and `abstractText`.
- SQL injection protection: all search terms parameterized.
- Empty search returns all papers within user's scope.
- Special characters handled safely; wildcards are not supported.
- Partial matching: substring matches allowed (e.g., "machine" matches "Machine Learning").
- Backend maps API camelCase fields to database snake_case fields (`author_name`, `abstract_text`).

#### Authorization Scoping

| Role             | Scope                                           | Can Use `archived` Param |
| ---------------- | ----------------------------------------------- | ------------------------ |
| STUDENT          | Non-archived papers only (all departments)      | ❌ (403 ACCESS_DENIED)   |
| TEACHER          | All papers including archived (all departments) | ❌ (403 ACCESS_DENIED)   |
| DEPARTMENT_ADMIN | All papers (all departments)                    | ✅                       |
| SUPER_ADMIN      | All papers (all departments)                    | ✅                       |

**Important:** `DEPARTMENT_ADMIN` department scoping applies **only** to `/api/admin/papers` and `/api/admin/requests` endpoints, not to `/api/papers`. This endpoint always returns papers from all departments for `DEPARTMENT_ADMIN`, matching homepage behavior.

#### Response Example

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

#### Error Codes

| Condition                             | HTTP | Code            | Message                                                          |
| ------------------------------------- | ---- | --------------- | ---------------------------------------------------------------- |
| Student/Teacher uses `archived` param | 403  | ACCESS_DENIED   | "You do not have permission to filter by archived status"        |
| Invalid `sortBy` value                | 400  | INVALID_REQUEST | "Invalid sort field. Must be: submissionDate, title, authorName" |
| Invalid `sortOrder` value             | 400  | INVALID_REQUEST | "Invalid sort order. Must be: asc, desc"                         |
| Invalid `year` format                 | 400  | INVALID_REQUEST | "Invalid year format. Must be a 4-digit year (e.g., 2023)"       |
| Invalid `departmentId` format         | 400  | INVALID_REQUEST | "Invalid department ID format"                                   |
| Invalid `page` or `size`              | 400  | INVALID_REQUEST | "Invalid pagination parameters"                                  |

#### Security Considerations

- SQL injection prevention: all parameters are properly escaped and parameterized.
- Enumeration attack prevention: students receive identical responses for non-existent and inaccessible/archived papers.
- Role-based filtering: backend enforces role-specific scoping regardless of client-provided parameters.
- Department ID validation: invalid department IDs are rejected with 400 error.

---

### GET /api/papers/{id}

**Purpose:** Retrieve a single `ResearchPaper` by ID.
**Authentication:** JWT required.
**Path Parameter:** `id` (number) — Paper ID.
**Response:** `ResearchPaper` object.

#### Authorization Scoping

| Role             | Scope                                           |
| ---------------- | ----------------------------------------------- |
| STUDENT          | Only non-archived papers, all departments       |
| TEACHER          | All papers, including archived, all departments |
| DEPARTMENT_ADMIN | All papers, including archived, all departments |
| SUPER_ADMIN      | All papers, including archived, all departments |

#### Error Codes

| Condition                                  | HTTP | Code                   | Message               |
| ------------------------------------------ | ---- | ---------------------- | --------------------- |
| Paper does not exist or inaccessible       | 404  | RESOURCE_NOT_FOUND     | "Paper not found"     |
| Paper is archived (student/teacher access) | 404  | RESOURCE_NOT_AVAILABLE | "Paper not available" |
| Invalid paper ID format                    | 400  | INVALID_REQUEST        | "Invalid paper ID"    |

**Security:** Students/teachers receive identical 404 for non-existent and inaccessible/archived papers.

---

### GET /api/papers/{paperId}/my-request

> NOTE: The return type of this endpoint is incorrect. It should return 200 whether the resource is found or not, or 200 with no content.
> its currently implemented so I am not touching this lol.

**Purpose:** Return the current user's request for the specified paper, if it exists.
**Authentication:** JWT required.
**Authorization:** Available to `STUDENT` and `TEACHER` roles.

**Path Parameter:** `paperId` (integer, required)
**Method:** GET
**Request Body:** _(None)_

**Response Example**

```json
{
    "requestId": 42,
    "status": "PENDING",
    "createdAt": "2024-06-01T12:00:00Z",
    "updatedAt": "2024-06-01T12:00:00Z"
}
```

**Errors**

- **404 RESOURCE_NOT_FOUND** if no request exists for this paper/user.
- **401 UNAUTHENTICATED** if JWT missing or invalid.

---

## Student/Teacher Requests

### GET /api/users/me/requests

**Purpose:** Retrieve a paginated and filterable list of requests created by the authenticated user.
**Authentication:** JWT required (`STUDENT` or `TEACHER`).
**Authorization:** Users can only see their own requests.

#### Query Parameters

| Parameter   | Type   | Required | Description                                                     |
| ----------- | ------ | -------- | --------------------------------------------------------------- |
| `page`      | number | No       | Zero-indexed page number (default: 0).                          |
| `size`      | number | No       | Results per page (default: 20, max: 100).                       |
| `status`    | string | No       | Filter by request status: `PENDING`, `ACCEPTED`, or `REJECTED`. |
| `search`    | string | No       | Partial match against `paper.title` or `paper.authorName`.      |
| `sortBy`    | string | No       | Sort field: `createdAt` (default), `paper.title`, or `status`.  |
| `sortOrder` | string | No       | Sort direction: `desc` (default) or `asc`.                      |

#### Response (200 OK)

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

#### Notes

- **Archived Papers:** This endpoint **SHOULD** return the authenticated user's requests even if the associated paper has been archived, with constraints to avoid information leakage:
    - Returned request object **MUST** include `requestId`, `status`, `createdAt`, `updatedAt`, and a minimal `paper` summary containing `paperId`, `title`, `department` and `archived: true`.
    - The `paper` object **MUST NOT** include sensitive fields such as `filePath` or download links for archived papers.
    - UI **SHOULD** indicate the paper is archived and allow the user to remove the request row (DELETE). Users **MUST NOT** be allowed to create new requests for archived papers.
    - This allows users to see and remove historical requests while preserving information security for archived resources.

- **Metadata:** Includes the full `paper` and nested `department` objects to allow the frontend to render the card/row without secondary API calls.

#### Error Codes

| Condition             | HTTP | Code            | Message                                                  |
| --------------------- | ---- | --------------- | -------------------------------------------------------- |
| Missing/Invalid JWT   | 401  | UNAUTHENTICATED | "Authentication required"                                |
| Invalid status filter | 400  | INVALID_REQUEST | "Invalid status. Must be PENDING, ACCEPTED, or REJECTED" |
| Invalid sort field    | 400  | INVALID_REQUEST | "Invalid sort field"                                     |

---

### POST /api/requests

**Purpose:** Create a new access request for a research paper.
**Authentication:** JWT required (`STUDENT` or `TEACHER`).
**Request Body**

```json
{
    "paperId": 123
}
```

#### Constraints

- Only one active (`PENDING` or `ACCEPTED`) request allowed per user/paper.
- Users can only request access to non-archived papers.

#### Response (201 Created)

```json
{
    "requestId": 42,
    "status": "PENDING"
}
```

#### Errors

- **404 RESOURCE_NOT_FOUND:** Paper does not exist or is archived.
- **409 DUPLICATE_REQUEST:** An active request already exists for this paper.

---

### DELETE /api/requests/{requestId}

**Purpose:** Cancel a `PENDING` request or remove a `REJECTED` request from the user's history.
**Authentication:** JWT required (`STUDENT` or `TEACHER`).
**Path Parameter:** `requestId` (number)

#### Constraints

- Returns `404 RESOURCE_NOT_FOUND` if the request does not belong to the user (security through obscurity).
- `ACCEPTED` requests cannot be deleted by the requesting user; they must be revoked by an Admin or the paper must be archived.
- Archiving the associated paper will also revoke access.

#### Response

- **204 No Content**

## Admin Requests

### GET /api/admin/requests

**Purpose:** Retrieve a paginated and filterable list of document access requests.
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (restricted to own department) or `SUPER_ADMIN` (global access).

#### Query Parameters

| Parameter      | Type   | Required | Description                                                                                                        |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `page`         | number | No       | Zero-indexed page number (default: 0).                                                                             |
| `size`         | number | No       | Results per page (default: 20, max: 100).                                                                          |
| `search`       | string | No       | Case-insensitive partial match against `user.fullName`, `user.email`, or `paper.title`.                            |
| `status`       | string | No       | Filter by status: `PENDING`, `ACCEPTED`, or `REJECTED`. Supports comma-separated lists (e.g., `PENDING,ACCEPTED`). |
| `departmentId` | string | No       | **SUPER_ADMIN only.** Filter by specific department ID. Must be rejected with 400 for `DEPARTMENT_ADMIN`.          |
| `sortBy`       | string | No       | Sort field: `createdAt` (default), `status`, `paper.title`, or `user.fullName`.                                    |
| `sortOrder`    | string | No       | Sort direction: `desc` (default) or `asc`.                                                                         |

#### Response (200 OK)

- Uses canonical pagination format.
- Each item includes fully expanded `user` and `paper` objects.

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
    ],
    "totalElements": 1,
    "totalPages": 1,
    "number": 0,
    "size": 20
}
```

#### Authorization & Security Rules

- **Department Scoping:** `DEPARTMENT_ADMIN` access is strictly scoped to their assigned department. Backend must append `WHERE paper.department_id = user.department_id` to queries for `DEPARTMENT_ADMIN`.
- **Information Concealment:** Attempts by a `DEPARTMENT_ADMIN` to query or search for requests outside their department must return `403 ACCESS_DENIED`.
- **Status Transitions:** Only `PENDING` requests may be modified. `ACCEPTED` and `REJECTED` are terminal states.

#### Error Codes

| Condition                            | HTTP | Code            | Message                                                            |
| ------------------------------------ | ---- | --------------- | ------------------------------------------------------------------ |
| Missing/Invalid JWT                  | 401  | UNAUTHENTICATED | "Authentication required".                                         |
| Cross-department access              | 403  | ACCESS_DENIED   | "You do not have permission to view requests for this department". |
| Admin attempts `departmentId` filter | 400  | INVALID_REQUEST | "departmentId filter not permitted for your role".                 |
| Invalid status value                 | 400  | INVALID_REQUEST | "Invalid status. Must be PENDING, ACCEPTED, or REJECTED".          |

---

### PUT /api/admin/requests/{requestId}/accept

**Purpose:** Approve a pending document access request (set status `PENDING` → `ACCEPTED`).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Path Parameter:** `requestId` (number) — Request ID.
**Method:** PUT
**Request Body:** _(None)_

#### Constraints & Behavior

- Only `PENDING` requests may be accepted. Attempts to accept `ACCEPTED` or `REJECTED` requests must return `409 REQUEST_ALREADY_FINAL`.
- `DEPARTMENT_ADMIN` may only accept requests for papers in their department. Cross-department attempts must return `403 ACCESS_DENIED`.
- Accepting a request grants the requesting user access to download/view the paper (subject to paper not being archived).
- The action must update `status` to `ACCEPTED` and set `updatedAt` timestamp.

#### Responses

- **200 OK**

    ```json
    {
        "requestId": 42,
        "status": "ACCEPTED",
        "updatedAt": "2024-06-01T12:05:00Z"
    }
    ```

#### Error Codes

| Condition                          | HTTP | Code                  | Message                                             |
| ---------------------------------- | ---- | --------------------- | --------------------------------------------------- |
| Request not found or inaccessible  | 404  | RESOURCE_NOT_FOUND    | "Request not found"                                 |
| Not authorized for this department | 403  | ACCESS_DENIED         | "You do not have permission to modify this request" |
| Request not in PENDING state       | 409  | REQUEST_ALREADY_FINAL | "Cannot modify request in terminal state"           |
| Missing/Invalid JWT                | 401  | UNAUTHENTICATED       | "Authentication required"                           |

---

### PUT /api/admin/requests/{requestId}/reject

**Purpose:** Reject a pending document access request (set status `PENDING` → `REJECTED`).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Path Parameter:** `requestId` (number) — Request ID.
**Method:** PUT
**Request Body:** _(Optional)_ `{ "reason": "string" }` — Admin-provided rejection reason (stored server-side; may be surfaced to user via notifications but not required in API response).

#### Constraints & Behavior

- Only `PENDING` requests may be rejected. Attempts to reject `ACCEPTED` or `REJECTED` requests must return `409 REQUEST_ALREADY_FINAL`.
- `DEPARTMENT_ADMIN` may only reject requests for papers in their department. Cross-department attempts must return `403 ACCESS_DENIED`.
- The action must update `status` to `REJECTED` and set `updatedAt` timestamp.

#### Responses

- **200 OK**

    ```json
    {
        "requestId": 42,
        "status": "REJECTED",
        "updatedAt": "2024-06-01T12:05:00Z"
    }
    ```

#### Error Codes

| Condition                          | HTTP | Code                  | Message                                             |
| ---------------------------------- | ---- | --------------------- | --------------------------------------------------- |
| Request not found or inaccessible  | 404  | RESOURCE_NOT_FOUND    | "Request not found"                                 |
| Not authorized for this department | 403  | ACCESS_DENIED         | "You do not have permission to modify this request" |
| Request not in PENDING state       | 409  | REQUEST_ALREADY_FINAL | "Cannot modify request in terminal state"           |
| Missing/Invalid JWT                | 401  | UNAUTHENTICATED       | "Authentication required"                           |

---

## Admin Papers

### GET /api/admin/papers

**Purpose:** Admin view for listing papers with department-scoped behavior.
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (scoped to their department) or `SUPER_ADMIN` (global).

#### Query Parameters

| Parameter      | Type   | Required | Description                                                                 |
| -------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `page`         | number | No       | Zero-indexed page number (default: 0)                                       |
| `size`         | number | No       | Results per page (default: 20, max: 100)                                    |
| `search`       | string | No       | Case-insensitive partial match across `title`, `authorName`, `abstractText` |
| `departmentId` | string | No       | **SUPER_ADMIN only.** Filter by department ID.                              |
| `archived`     | string | No       | Filter archived status: "true" or "false"                                   |
| `sortBy`       | string | No       | Sort field: `submissionDate` (default), `title`, `authorName`               |
| `sortOrder`    | string | No       | Sort direction: `desc` (default), `asc`                                     |

#### Authorization Scoping

- `DEPARTMENT_ADMIN` results must be scoped to `user.department.departmentId`. Backend must enforce `WHERE paper.department_id = user.department_id`.
- `SUPER_ADMIN` may query across all departments and use `departmentId` filter.

#### Response

- Canonical pagination response with full `ResearchPaper` objects.

#### Error Codes

| Condition                            | HTTP | Code            | Message                                           |
| ------------------------------------ | ---- | --------------- | ------------------------------------------------- |
| Missing/Invalid JWT                  | 401  | UNAUTHENTICATED | "Authentication required"                         |
| DEPARTMENT_ADMIN uses `departmentId` | 400  | INVALID_REQUEST | "departmentId filter not permitted for your role" |
| Invalid query parameters             | 400  | INVALID_REQUEST | "Invalid query parameters"                        |

---

### POST /api/admin/papers

**Purpose:** Create a new paper record (admin-only).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Request Body:** `ResearchPaperCreate` object (fields such as `title`, `authorName`, `abstractText`, `departmentId`, `submissionDate`, etc.). File upload handled separately via file upload endpoints.

**Constraints**

- `DEPARTMENT_ADMIN` may only create papers for their department. Attempts to create for other departments must return `403 ACCESS_DENIED`.
- Required fields validated; missing/invalid fields return `400 VALIDATION_ERROR` with `details` array.

**Response (201 Created)**

```json
{
    "paperId": 124,
    "title": "New Paper Title",
    "department": { "departmentId": 1, "departmentName": "Computer Science" },
    "submissionDate": "2025-01-15",
    "archived": false
}
```

**Error Codes**

| Condition                            | HTTP | Code             | Message                                          |
| ------------------------------------ | ---- | ---------------- | ------------------------------------------------ |
| Missing/Invalid JWT                  | 401  | UNAUTHENTICATED  | "Authentication required"                        |
| Not allowed to create for department | 403  | ACCESS_DENIED    | "You do not have permission for this department" |
| Validation errors                    | 400  | VALIDATION_ERROR | "Field-level validation failed"                  |

---

### PUT /api/admin/papers/{paperId}

**Purpose:** Update paper metadata (admin-only).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Path Parameter:** `paperId` (number) — Paper ID.
**Request Body:** Partial `ResearchPaperUpdate` object (fields allowed to change).

#### Constraints & Behavior

- `DEPARTMENT_ADMIN` may only update papers in their department. Cross-department attempts must return `403 ACCESS_DENIED`.
- Cannot change `paperId`.
- Validation errors return `400 VALIDATION_ERROR` with `details`.

#### Response (200 OK)

```json
{
    "paperId": 123,
    "title": "Updated Title",
    "updatedAt": "2025-02-01T10:00:00Z"
}
```

#### Error Codes

| Condition                          | HTTP | Code               | Message                                           |
| ---------------------------------- | ---- | ------------------ | ------------------------------------------------- |
| Paper not found                    | 404  | RESOURCE_NOT_FOUND | "Paper not found"                                 |
| Not authorized for this department | 403  | ACCESS_DENIED      | "You do not have permission to modify this paper" |
| Validation errors                  | 400  | VALIDATION_ERROR   | "Field-level validation failed"                   |

---

### DELETE /api/admin/papers/{paperId}

**Purpose:** Archive a paper (soft-delete) or permanently delete (admin-only; behavior may be environment-dependent).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Path Parameter:** `paperId` (number) — Paper ID.
**Method:** DELETE

#### Archiving Behavior (Soft Delete)

- Default behavior: mark `archived: true` and set `archivedAt` timestamp.
- Archiving revokes all `ACCEPTED` requests for that paper (access revoked).
- Archived papers are not downloadable; attempts to access file download endpoints for archived papers must return `404 RESOURCE_NOT_AVAILABLE`.
- Users may still see historical requests referencing archived papers via `/api/users/me/requests` (see earlier notes), but sensitive fields (e.g., `filePath`) must be omitted.

#### Permanent Deletion

- Permanent deletion may be restricted to `SUPER_ADMIN` or require additional safeguards (e.g., confirmation, audit log). If implemented, permanent deletion removes DB record and associated file from storage; missing file errors must be handled gracefully.

#### Responses

- **204 No Content** for successful archive or deletion.

#### Error Codes

| Condition                          | HTTP | Code               | Message                                           |
| ---------------------------------- | ---- | ------------------ | ------------------------------------------------- |
| Paper not found                    | 404  | RESOURCE_NOT_FOUND | "Paper not found"                                 |
| Not authorized for this department | 403  | ACCESS_DENIED      | "You do not have permission to modify this paper" |
| Missing/Invalid JWT                | 401  | UNAUTHENTICATED    | "Authentication required"                         |

---

## File Uploads and Downloads

### Conventions

- **Content-Type:** `multipart/form-data` for uploads.
- **Max file size:** 20 MB. Files exceeding this limit must return `413 FILE_TOO_LARGE`.
- **Allowed file types:** PDF and DOCX. Other types must return `415 UNSUPPORTED_MEDIA_TYPE`.
- **File storage:** Files stored on disk or object storage; `filePath` in `ResearchPaper` points to storage location (opaque to clients).

---

### POST /api/admin/papers/{paperId}/file

**Purpose:** Upload or replace the file associated with a paper (admin-only).
**Authentication:** JWT required.
**Roles:** `DEPARTMENT_ADMIN` (for their department) or `SUPER_ADMIN` (global).

**Path Parameter:** `paperId` (number) — Paper ID.
**Request:** `multipart/form-data` with file field `file`.

#### Constraints & Behavior

- File size must be ≤ 20 MB. Larger files return `413 FILE_TOO_LARGE`.
- File MIME type must be `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX). Otherwise return `415 UNSUPPORTED_MEDIA_TYPE`.
- `DEPARTMENT_ADMIN` may only upload for papers in their department.
- On success, backend stores file and updates `filePath` on the `ResearchPaper` record.

#### Responses

- **200 OK**

    ```json
    {
        "paperId": 123,
        "filePath": "2025/dept_cs/paper_123.pdf",
        "uploadedAt": "2025-02-01T11:00:00Z"
    }
    ```

#### Error Codes

| Condition              | HTTP | Code                   | Message                               |
| ---------------------- | ---- | ---------------------- | ------------------------------------- |
| File too large         | 413  | FILE_TOO_LARGE         | "File exceeds 20MB limit"             |
| Unsupported media type | 415  | UNSUPPORTED_MEDIA_TYPE | "File is not PDF or DOCX"             |
| Paper not found        | 404  | RESOURCE_NOT_FOUND     | "Paper not found"                     |
| File storage I/O error | 500  | FILE_STORAGE_ERROR     | "File missing on disk or I/O failure" |
| Missing/Invalid JWT    | 401  | UNAUTHENTICATED        | "Authentication required"             |

---

### GET /api/papers/{paperId}/file

**Purpose:** Download the file associated with a paper.
**Authentication:** JWT required.
**Authorization:** Depends on role and request status.

**Path Parameter:** `paperId` (number) — Paper ID.
**Method:** GET

#### Authorization Rules

- **STUDENT:** May download only if they have an `ACCEPTED` request for the paper and the paper is not archived.
- **TEACHER:** May download only if they have an `ACCEPTED` request and the paper is not archived.
- **DEPARTMENT_ADMIN:** Full access for their department.
- **SUPER_ADMIN:** Full access across departments.

#### Responses

- **200 OK** — Returns file binary with appropriate `Content-Type` and `Content-Disposition` headers.
- **404 FILE_NOT_FOUND** — If physical file missing from storage.
- **404 RESOURCE_NOT_AVAILABLE** — If paper is archived (students/teachers).
- **403 ACCESS_DENIED** — If user lacks permission to download.

#### Error Codes

| Condition                      | HTTP | Code                   | Message                                            |
| ------------------------------ | ---- | ---------------------- | -------------------------------------------------- |
| File missing on storage        | 404  | FILE_NOT_FOUND         | "Physical file is missing from storage"            |
| Paper archived or inaccessible | 404  | RESOURCE_NOT_AVAILABLE | "Paper not available"                              |
| User lacks permission          | 403  | ACCESS_DENIED          | "You do not have permission to download this file" |
| Missing/Invalid JWT            | 401  | UNAUTHENTICATED        | "Authentication required"                          |

---

## File Storage and Error Handling

### FILE_STORAGE_ERROR

- **Definition:** Indicates physical file missing on disk or I/O failure when accessing storage.
- **HTTP:** 500
- **Response Body Example**

```json
{
    "code": "FILE_STORAGE_ERROR",
    "message": "File missing on disk or I/O failure",
    "traceId": "..."
}
```

### Handling Rules

- All `FILE_STORAGE_ERROR` occurrences must trigger monitoring alerts and on-call notifications.
- Backend must log full stack trace server-side for diagnostics; response must not include stack traces.
- If file is missing during download, return `404 FILE_NOT_FOUND` to the client and log `FILE_STORAGE_ERROR` internally.

---

## Rate Limiting and Throttling

### Behavior

- Rate limiting enforced at proxy layer (API gateway or reverse proxy).
- When proxy returns HTTP 429 it **SHOULD** include `Retry-After` header (seconds).
- Backend application does not emit 429 for request throttling; it relies on proxy.
- Frontend **MUST** disable submission during the retry window when receiving 429.

### Error Response Example (Proxy)

- **429 RATE_LIMIT_EXCEEDED**

```json
{
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests in time window",
    "traceId": "..."
}
```

### Logging

- Rate limit violations should be logged for abuse detection and analytics.

---

## Monitoring, Auditing, and Alerts

### Mandatory Audit Events

- **Authentication failures** (`UNAUTHENTICATED`, `REFRESH_TOKEN_REVOKED`) — log for security monitoring.
- **INTERNAL_ERROR** — log full stack trace server-side and trigger alerting.
- **FILE_STORAGE_ERROR** — trigger monitoring alerts and on-call notifications.
- **Rate limit violations** — log for abuse detection.

### Traceability

- All error responses may include an opaque `traceId` for correlation with server logs. `traceId` must not leak internal state or be used to infer system internals.

---

## Security Notes

- **Information Leakage Prevention:** Use 404 for archived or inaccessible resources to prevent enumeration.
- **Token Handling:** Refresh tokens are HttpOnly cookies; frontend must not read or store them.
- **Input Validation:** All user-supplied parameters must be validated and parameterized to prevent SQL injection.
- **Role Enforcement:** Backend must enforce role-based access control regardless of client-provided parameters.

---

## Webhooks and Integrations

> Experimental...

### Webhook Overview

- **Purpose:** Allow external systems to receive event notifications (e.g., request status changes, paper archived, file uploaded).
- **Delivery:** HTTP `POST` with JSON payload to a configured endpoint.
- **Security:** Webhooks must be signed using an HMAC header (`X-Signature`) computed with a shared secret. The backend must support signature verification and replay protection (timestamps + nonce).
- **Retries:** On non-2xx responses, the sender retries with exponential backoff. Retry policy and maximum attempts must be documented in integration settings.

### Supported Events

| Event Key         | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `request.created` | A new access request was created                         |
| `request.updated` | Request status changed (`PENDING` → `ACCEPTED/REJECTED`) |
| `paper.archived`  | Paper was archived                                       |
| `paper.created`   | New paper record created                                 |
| `paper.updated`   | Paper metadata updated                                   |
| `file.uploaded`   | File uploaded or replaced for a paper                    |

### Webhook Payload Example

```json
{
    "event": "request.updated",
    "timestamp": "2025-02-01T12:05:00Z",
    "data": {
        "requestId": 42,
        "status": "ACCEPTED",
        "userId": 100,
        "paperId": 123
    }
}
```

### Webhook Security Requirements

- `X-Signature` header: HMAC-SHA256 of the request body using the shared secret.
- `X-Timestamp` header: ISO 8601 UTC timestamp of when the webhook was generated.
- Replay protection: Reject requests where `X-Timestamp` is older than a configurable window (e.g., 5 minutes).
- Idempotency: Consumers should handle duplicate events gracefully; events include unique identifiers and timestamps.

---

## Integration Notes

- **Rate Limits:** Integrations should respect API rate limits enforced by the proxy. When receiving `429`, integrations must honor `Retry-After`.
- **Pagination:** Use `page` and `size` parameters for listing endpoints. Default `size` is 20; maximum is 100.
- **Timezones:** All timestamps are ISO 8601 UTC. Clients should convert to local timezones for display.
- **Error Handling:** Integrations must parse the canonical error response (`code`, `message`, `details`, `traceId`) and implement logic based on `code`. Do not rely on `message` for programmatic decisions.
- **Retries and Backoff:** For transient errors (`500`, `503`, network timeouts), use exponential backoff with jitter. For client errors (`4xx`), do not retry unless corrective action is taken.

---

## Appendix A — Data Models (summary)

> **Note:** This appendix summarizes key fields used across endpoints. It is not exhaustive; refer to endpoint sections for full context.

### ResearchPaper (summary)

| Field            | Type    | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| `paperId`        | number  | Unique paper identifier                     |
| `title`          | string  | Paper title                                 |
| `authorName`     | string  | Author or lead researcher                   |
| `abstractText`   | string  | Abstract text                               |
| `department`     | object  | `{ departmentId, departmentName }`          |
| `submissionDate` | string  | `YYYY-MM-DD` submission date                |
| `filePath`       | string  | Opaque storage path for the file            |
| `archived`       | boolean | Whether paper is archived                   |
| `archivedAt`     | string  | ISO 8601 timestamp when archived (nullable) |

### Request (summary)

| Field       | Type   | Description                       |
| ----------- | ------ | --------------------------------- |
| `requestId` | number | Unique request identifier         |
| `userId`    | number | Requesting user ID                |
| `paperId`   | number | Associated paper ID               |
| `status`    | string | `PENDING`, `ACCEPTED`, `REJECTED` |
| `createdAt` | string | ISO 8601 timestamp                |
| `updatedAt` | string | ISO 8601 timestamp                |

### User (summary)

| Field        | Type   | Description                                             |
| ------------ | ------ | ------------------------------------------------------- |
| `userId`     | number | Unique user identifier                                  |
| `email`      | string | Verified email                                          |
| `fullName`   | string | Full name                                               |
| `role`       | string | `STUDENT`, `TEACHER`, `DEPARTMENT_ADMIN`, `SUPER_ADMIN` |
| `department` | object | Department object for `DEPARTMENT_ADMIN`                |

---

## Appendix B — Common Error Codes Quick Reference

| Code                     | HTTP | When to use / Meaning                      |
| ------------------------ | ---- | ------------------------------------------ |
| `VALIDATION_ERROR`       | 400  | Field-level validation failed              |
| `INVALID_REQUEST`        | 400  | Malformed JSON or invalid query parameters |
| `UNAUTHENTICATED`        | 401  | Missing or invalid JWT                     |
| `REFRESH_TOKEN_REVOKED`  | 401  | Refresh token missing/expired/revoked      |
| `ACCESS_DENIED`          | 403  | Role or department scope violation         |
| `RESOURCE_NOT_FOUND`     | 404  | Resource does not exist                    |
| `RESOURCE_NOT_AVAILABLE` | 404  | Resource exists but archived/inaccessible  |
| `FILE_NOT_FOUND`         | 404  | Physical file missing from storage         |
| `DUPLICATE_REQUEST`      | 409  | Active request already exists              |
| `REQUEST_ALREADY_FINAL`  | 409  | Attempt to modify terminal state           |
| `FILE_TOO_LARGE`         | 413  | File exceeds 20MB                          |
| `UNSUPPORTED_MEDIA_TYPE` | 415  | File is not PDF or DOCX                    |
| `RATE_LIMIT_EXCEEDED`    | 429  | Too many requests in time window           |
| `INTERNAL_ERROR`         | 500  | Unhandled server error                     |
| `FILE_STORAGE_ERROR`     | 500  | File I/O or storage failure                |
| `SERVICE_UNAVAILABLE`    | 503  | External dependency or DB down             |
