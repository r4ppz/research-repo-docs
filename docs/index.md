# Research Repository System

This is the documentation site for the school project **Research Repository System**. This will include all the
information about the system (future plan, current state, API contract, logic, etc.). Every change to the system will be documented here first.

The **Research Repository** is a gated academic research portal where students can browse paper metadata, request access to full documents, and administrators review, manage papers and student requests.

- [Frontend](https://github.com/r4ppz/research-repository), [backend](https://github.com/r4ppz/research-repository-backend) and [documentation](https://github.com/r4ppz/research-repo-docs) are all open source — [contributions](./contribute.md) are welcome.

<!-- prettier-ignore-start -->
!!! question "Available for testing!"
    See the [Testing page](testing.md) for instructions.

!!! warning
    This system is currently in alpha, which means APIs are unstable, incomplete and prone to bugs.
    A stable version (beta) will be released once the system is sufficiently usable.

<!-- prettier-ignore-end -->

---

## Project status

<small style="color: gray;">in progress...</small>

- Phase: **Alpha**
- Maintenance: student-led project developed in spare time — **feature timelines are informal**

---

## Tech Stack

### [Backend](https://github.com/r4ppz/research-repository-backend)

RESTful API with Java 21 and Spring Boot.

> see [pom.xml](https://github.com/r4ppz/research-repository-backend/blob/main/pom.xml) for more accurate info.

- Framework: Spring Boot 3
- Build: Maven
- Database: PostgreSQL, Spring Data JPA, Flyway
- Security: Spring Security, OAuth2, JWT, Google API Client
- Utilities: Lombok, Bean Validation
- Infrastructure: Docker

### [Frontend](https://github.com/r4ppz/research-repository-frontend)

SPA with React and TypeScript.

> see [package.json](https://github.com/r4ppz/research-repository-frontend/blob/main/package.json) for more accurate info.

- Framework: React 19 (with compiler)
- Build: Vite
- Language: TypeScript
- State/Data: TanStack Query, Axios
- UI: Radix UI, TanStack Table, Lucide/React Icons, Clsx, React Aria, Storybook
- Routing: React Router DOM
- Styling: CSS Modules
- Tooling: ESLint, Stylelint, Prettier
- Deployment: Github Pages via GitHub Actions

### [Documentation](https://github.com/r4ppz/research-repo-docs)

> see [requirements.txt](https://github.com/r4ppz/research-repo-docs/blob/main/requirements.txt) for more accurate info.

- Framework: Mkdocs
- Format: Markdown
- Deployment: Github Pages via GitHub Actions

---

## Branding and Licensing

The **source code** (backend and frontend) and documentation are licensed under the [MIT License](https://github.com/r4ppz/research-repository-frontend/blob/main/LICENSE). This means you’re free to use, copy, modify, and share the code, as long as the license notice is included.

The school’s name, logo, and all research papers in this system are the property of the school and are **not** covered by the open-source license.

The software is provided **as is**, and the developers **are not responsible** for any problems, including but not limited to server errors, data loss, or other issues that may occur while using it.
