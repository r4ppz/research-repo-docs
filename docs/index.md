# Research Repository

The Research Repository is a gated academic research portal where students can browse paper metadata, request access to full documents, and administrators review, manage papers and student requests.

- [Frontend](https://github.com/r4ppz/research-repository) and [documentation/specifications](https://github.com/r4ppz/research-repo-docs) are open source — contributions are welcome.
- Backend code is closed source. If you'd like to help maintain or contribute to backend work, please contact the maintainers.

> Note: This system is currently in alpha, which means the APIs are unstable and incomplete. Expect breaking changes!. A stable version (beta) will be released once the system is sufficiently usable.

> We are student developers learning to design a reliable system. If you see a problem, security issue, architectural flaw, or anything else with our design, please notify us so we can improve. This is open source by choice so you can help us and also check the reliability of the system we are creating.

---

## Project status

- Phase: **Alpha**
- Maintenance: student-led project developed in spare time — feature timelines are informal

---

## Tech Stack

#### Backend

The backend is a RESTful API built with Java 21 and the Spring Boot ecosystem.

- Core Framework: Spring Boot 3
- Language: Java 21
- Build Tool: Maven
- Database & Persistence:
    - PostgreSQL: Relational database for data storage.
    - Spring Data JPA (Hibernate): Object-Relational Mapping (ORM).
    - Flyway: Database version control and migration management (schema/data population).
- Security & Authentication:
    - Spring Security: For securing API endpoints.
    - OAuth2 Resource Server: Integration for token-based security.
    - JWT (jjwt): Custom implementation for JSON Web Token generation and validation.
    - Google API Client: For Google OAuth2 integration.
- Utilities & Quality:
    - Lombok: Reducing boilerplate code (annotations for getters, setters, builders, etc.).
    - Validation: JSR-380 (Bean Validation) for request DTOs.
- Infrastructure:
    - Docker: Containerization via Dockerfile and docker-compose.yml.

#### Frontend

The frontend is a Single Page Application (SPA) built with React and TypeScript.

- Core Library: React 19 (with React compiler)
- Build Tool & Dev Server: Vite 7
- Language: TypeScript
- State Management & Data Fetching:
    - TanStack Query (React Query) v5: For state management and caching.
    - Axios: HTTP client for API communication.
- UI & Components:
    - Radix UI: Unstyled, accessible UI primitives (Dialog, Select, Tooltip).
    - TanStack Table v8: Headless UI for building powerful tables and data grids.
    - Lucide React & React Icons: Icon sets.
    - Clsx: Utility for constructing conditional class names.
- Routing:
    - React Router DOM v7: Navigation and routing management.
- Styling:
    - Pure CSS / CSS Modules: Using global.css, variables.css, and reset.css.
- Tooling & Linting:
    - ESLint v9: For JavaScript/TypeScript linting.
    - Stylelint v16: For CSS linting and formatting.
    - Prettier: Code formatting.
- Deployment:
    - gh-pages: Used for deploying to GitHub Pages.

---

## Contributing

- Read `docs/api_contract.md` before implementing new frontend integrations.
- Prefer small, focused pull requests that update docs and code together when applicable.

Contact the maintainers via the repository [issues](https://github.com/r4ppz/research-repository/issues).

---

## Branding and Intellectual Property

The school’s name, logo, and all research papers hosted within this system are the property of the school. The MIT license applies strictly to the source code and documentation.

The software is provided “as is”, without warranty of any kind, express or implied. The developers do not warrant that the system will be uninterrupted, error-free, or that data loss will not occur.

In no event shall the developers be liable for any direct, indirect, incidental, or consequential damages (including, but not limited to, loss of data, database corruption, or system downtime) arising out of the use or inability to use the system, even if advised of the possibility of such damage.
