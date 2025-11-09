# Database Schema

Version: 2025-10-22

## Canonical Database Schema (Postgres)

V1:

```sql
CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  department_name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TYPE user_role AS ENUM ('STUDENT', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  department_id INT NULL REFERENCES departments(department_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE research_papers (
  paper_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  abstract TEXT NOT NULL, -- API field name is abstractText
  file_url VARCHAR(512) NOT NULL,
  department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE document_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  paper_id INT NOT NULL REFERENCES research_papers(paper_id) ON DELETE CASCADE,
  request_date TIMESTAMP NOT NULL DEFAULT now(),
  status request_status NOT NULL DEFAULT 'PENDING',
  UNIQUE(user_id, paper_id)
);

CREATE INDEX IF NOT EXISTS idx_papers_archived ON research_papers(archived);
```

## Notes

- Student users: `department_id` is NULL.
- Department admins: `department_id` set to their department.
- Super admins: `department_id` NULL.
- Papers always have `department_id`.
- Archive is a visibility toggle independent from requests/permissions.

