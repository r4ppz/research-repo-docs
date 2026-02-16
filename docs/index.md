# Research Repository System

The Research Repository is a gated academic research portal where students can browse paper metadata, request access to full documents, and administrators review, manage papers and student requests.

- [Frontend](https://github.com/r4ppz/research-repository), [backend](https://github.com/r4ppz/research-repository-backend) and [documentation](https://github.com/r4ppz/research-repo-docs) are all open source — contributions are welcome.

<!-- prettier-ignore-start -->
!!! warning
    This system is currently in alpha, which means the APIs are unstable, incomplete, and prone to bugs. A stable version (beta) will be released once the system is sufficiently usable.

!!! note
    We are student developers learning to design a reliable system. If you see a problem, security issue, architectural flaw, or anything else with our design, please [notify](https://github.com/r4ppz/research-repository/issues) us so we can improve. This is open source by choice so you can help us and also check the reliability of the system we are creating.

!!! ready "Available for testing"
    See the [Testing page](testing.md) for instructions.
<!-- prettier-ignore-end -->

---

## Project status

- Phase: **Alpha**
- Maintenance: student-led project developed in spare time — **feature timelines are informal**

---

## Tech Stack

#### Backend

RESTful API with Java 21 and Spring Boot.

- Framework: Spring Boot 3
- Build: Maven
- Database: PostgreSQL, Spring Data JPA, Flyway
- Security: Spring Security, OAuth2, JWT, Google API Client
- Utilities: Lombok, Bean Validation
- Testing: JUnit, Mockito, Testcontainers
- Infrastructure: Docker

#### Frontend

SPA with React and TypeScript.

- Framework: React 19
- Build: Vite
- Language: TypeScript
- State/Data: TanStack Query, Axios
- UI: Radix UI, TanStack Table, Lucide/React Icons, Clsx
- Routing: React Router DOM
- Styling: CSS Modules
- Tooling: ESLint, Stylelint, Prettier
- Testing: Jest, React Testing Library
- Deployment: gh-pages

---

## Contributing

- Read [API contract](./api_contract.md) before implementing new frontend integrations.
- Prefer small, focused pull requests that update docs and code together when applicable.

Contact the maintainers via the repository [issues](https://github.com/r4ppz/research-repository/issues).

---

## Branding and Licensing

The school’s name, logo, and all research papers in this system are the property of the school and are **not** covered by the open-source license. You may not use these materials without the school’s permission.

The **source code** (backend and frontend) and documentation are licensed under the [MIT License](https://github.com/r4ppz/research-repository-frontend/blob/main/LICENSE). This means you’re free to use, copy, modify, and share the code, as long as the license notice is included.

The software is provided **“as is”**, and the developers **are not responsible** for any problems, including but not limited to server errors, data loss, or other issues that may occur while using it.
