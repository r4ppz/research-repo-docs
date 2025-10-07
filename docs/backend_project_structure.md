# Research Repository — Backend Project Structure (V1)

> Note: Backend devs will have to edit this themselves since im not a backend dev :/

Version: 2025-10-07  
Audience: Backend devs  
Status: V1 — First version. Still a developer choice. You may evolve this as you code, but keep domain models and API in sync with main spec.

---

## Recommended Structure (Spring Boot + JPA + Flyway)

```
src/
├─ main/java/com/acd/research/
│  ├─ ResearchRepositoryApplication.java
│  ├─ config/            # Security, OpenAPI, CORS
│  ├─ security/          # JwtService, JwtAuthFilter
│  ├─ auth/              # GoogleAuthController
│  ├─ controller/        # Paper, Request, File, Admin
│  ├─ service/           # PaperService, StorageService, RequestService
│  ├─ repo/              # JPA repositories
│  ├─ dto/               # Request/response DTOs
│  ├─ model/             # Entities & enums (domain objects)
│  └─ exception/         # Global handler
└─ main/resources/
   ├─ application.yml
   └─ db/migration/
      ├─ V1__init.sql
      └─ V2__add_paper_archive.sql
```

---

## Key Principles

- Entities and enums in `model/` match the contract in main spec.
- Controllers are thin; business logic lives in services.
- All API request/response DTOs are camelCase and match contract types.
- Migrations are managed by Flyway in `db/migration/`.
- Security enforced via Spring Security filters, method-level guards.

---

## Getting Started

1. Scaffold folders as above.
2. Implement domain models/entities per spec.
3. Add Flyway V1**init.sql and V2**add_paper_archive.sql for schema.
4. Implement JWT auth, Google ID token verification in `auth/`.
5. Implement controllers per API contract.
6. Wire up services, repos, exception handling.
7. Document all API changes in the main spec before implementing.

---

## Docs

- Put README.md and any onboarding docs in project root.
- Reference the main spec and API contract as your source of truth.
