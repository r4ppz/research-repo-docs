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

- Read `docs/api_contract.md` before implementing new frontend integrations.
- Prefer small, focused pull requests that update docs and code together when applicable.

Contact the maintainers via the repository [issues](https://github.com/r4ppz/research-repository/issues).

---

## Branding and Intellectual Property

The school’s name, logo, and all research papers hosted within this system are the property of the school. The MIT license applies strictly to the source code and documentation.

The software is provided “as is”, without warranty of any kind, express or implied. The developers do not warrant that the system will be uninterrupted, error-free, or that data loss will not occur.

In no event shall the developers be liable for any direct, indirect, incidental, or consequential damages (including, but not limited to, loss of data, database corruption, or system downtime) arising out of the use or inability to use the system, even if advised of the possibility of such damage.
