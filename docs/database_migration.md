# Database Schema and Flyway Migration

## Database Schema (Postgres)

### V1\_\_initial_schema.sql

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DEPARTMENTS
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(64) UNIQUE NOT NULL
);

-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    department_id INT NULL REFERENCES departments(department_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for fast department-based lookups
CREATE INDEX idx_users_department ON users(department_id);

-- RESEARCH PAPERS
CREATE TABLE research_papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    abstract_text TEXT NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- relative file path, e.g. '2023/dept_cs/paper_123.pdf', not full API URL
    department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
    submission_date DATE NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for filtering & RBAC queries
CREATE INDEX idx_papers_department ON research_papers(department_id);
CREATE INDEX idx_papers_submission_date ON research_papers(submission_date);
CREATE INDEX idx_papers_archived ON research_papers(archived);

-- DOCUMENT REQUESTS
CREATE TABLE document_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES research_papers(paper_id) ON DELETE CASCADE,
    request_date TIMESTAMP NOT NULL DEFAULT now(),
    status request_status NOT NULL DEFAULT 'PENDING',
    -- Allow multiple requests per user/paper over time (enabling re-requests after rejection)
    -- Database-level constraint prevents duplicate PENDING/ACCEPTED requests
);

-- Indexes for performance
CREATE INDEX idx_requests_user ON document_requests(user_id);
CREATE INDEX idx_requests_paper ON document_requests(paper_id);
-- Partial unique index to prevent duplicate PENDING or ACCEPTED requests for same user/paper
CREATE UNIQUE INDEX idx_unique_pending_accepted_request
ON document_requests (user_id, paper_id)
WHERE status IN ('PENDING', 'ACCEPTED');

```

### V2\_\_refresh_token_schema.sql

```sql
CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    last_used_at TIMESTAMP NULL
);

-- Indexes for efficient lookups and validation
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```
