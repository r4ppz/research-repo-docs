# Research Repository System

This is the documentation site for the school project **Research Repository System**. It includes all information about the system (future plans, current state, API contract, logic, etc.). Every change to the system will be documented here first.

The **Research Repository** is a gated academic research portal where students can browse paper metadata, request access to full documents, and administrators review, manage papers and student requests.

- [Frontend](https://github.com/r4ppz/research-repository-frontend), [backend](https://github.com/r4ppz/research-repository-backend) and [documentation](https://github.com/r4ppz/research-repo-docs) are all open source — [contributions](./contribute.md) are welcome.

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

> Dependencies and exact versions are defined in [pom.xml](https://github.com/r4ppz/research-repository-backend/blob/main/pom.xml).

- Framework: Spring Boot 3
- Build: Maven
- Database: PostgreSQL, Spring Data JPA, Flyway
- Security: Spring Security, OAuth2, JWT, Google API Client
- Utilities: Lombok, Bean Validation
- Infrastructure: Docker

### [Frontend](https://github.com/r4ppz/research-repository-frontend)

SPA with React and TypeScript.

> Dependencies and exact versions are defined in [package.json](https://github.com/r4ppz/research-repository-frontend/blob/main/package.json).

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

> Dependencies and exact versions are defined in [requirements.txt](https://github.com/r4ppz/research-repo-docs/blob/main/requirements.txt).

- Site Generator: MkDocs
- Format: Markdown
- Deployment: Github Pages via GitHub Actions

---

## Branding and Licensing

The **source code** (backend, frontend) and documentation are licensed under the [MIT License](https://github.com/r4ppz/research-repository-frontend/blob/main/LICENSE). You may use, copy, modify, and distribute the code in accordance with the terms of that license.

The school's name, logo, trademarks, and all research papers or uploaded content within the system are the exclusive property of the school and their respective authors. These materials are not covered by the MIT License and may not be used, reproduced, or redistributed without permission.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. The developers shall not be liable for any damages arising from the use of this software.
