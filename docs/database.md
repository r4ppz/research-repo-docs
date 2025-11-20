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
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    abstract_text TEXT NOT NULL,
    file_url VARCHAR(512) NOT NULL,
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
    UNIQUE(user_id, paper_id)
);

-- Indexes for performance
CREATE INDEX idx_requests_user ON document_requests(user_id);
CREATE INDEX idx_requests_paper ON document_requests(paper_id);

```
