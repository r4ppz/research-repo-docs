### V1\_\_initial_schema.sql

```
-- Design choices:
-- No enum since its hard to map java to postgres enum, it is handle in app layer
-- No second auto update timestamp, handle in application layer
-- Partial unique index in document_requests to prevent duplicate PENDING or ACCEPTED requests for same user/paper
-- Email validation handle in app layer
-- Serial is old but good, map easily in Java using integer

-- NOTE: Every design change (new, fix, or improvement) must be documented (WHY).
-- In prod, all schema changes must be versioned and applied via proper migration scripts.
-- In dev, complete schema rewrites are allowed temporarily.

-- DEPARTMENTS
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
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
    file_path VARCHAR(512) NOT NULL,
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
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_requests_user ON document_requests(user_id);
CREATE INDEX idx_requests_paper ON document_requests(paper_id);
CREATE INDEX idx_requests_created_at ON document_requests(created_at);
CREATE INDEX idx_requests_updated_at ON document_requests(updated_at);

-- Partial unique index to prevent duplicate PENDING or ACCEPTED requests for same user/paper
CREATE UNIQUE INDEX idx_unique_pending_accepted_request
ON document_requests(user_id, paper_id)
WHERE status IN ('PENDING', 'ACCEPTED');

CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    last_used_at TIMESTAMP NULL
);

```
