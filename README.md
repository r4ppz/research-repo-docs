# Research Repository — Documentation

> These docs will change a lot since many of the features are still not finalized.

Central documentation for the Research Repository project.

- **Current Status:** Development
- **Repository Type:** Documentation-only repository for the Research Repository project
- **Single Source of Truth:** API Contract and Specification documents

---

## Overview

| Document                                                                 | Description                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [Research Repository Specification](./docs/research_repo_spec.md)        | Main system design, roles, and database schema              |
| [API Contract](./docs/api_contract.md)                                   | Full REST API endpoints and data contracts                  |
| [OpenAPI Specification](./docs/openapi.yaml)                             | Machine-readable OpenAPI 3.0 API specification              |
| [Frontend Repository](https://github.com/r4ppz19/research-repository)    | Frontend repository written in React                        |
| [GitHub Pages (Live Demo)](https://r4ppz.github.io/research-repository/) | Deployed static frontend. No backend. **Not yet finished.** |

---

## Using the OpenAPI Specification

The OpenAPI 3.0 specification (`docs/openapi.yaml`) enables automated tooling for API development:

### Generate TypeScript Types

```bash
npx openapi-typescript docs/openapi.yaml -o src/types/api.ts
```

### Generate API Clients

```bash
# Axios client
npx openapi-generator-cli generate -i docs/openapi.yaml -g typescript-axios -o src/api

# Fetch client
npx openapi-generator-cli generate -i docs/openapi.yaml -g typescript-fetch -o src/api
```

### Run Mock Server

```bash
# Using Prism
npx @stoplight/prism-cli mock docs/openapi.yaml

# Using Mockoon CLI
mockoon-cli start --data docs/openapi.yaml
```

### View in Swagger UI

```bash
# Using swagger-ui-watcher
npx swagger-ui-watcher docs/openapi.yaml

# Or import into Swagger Editor: https://editor.swagger.io/
```

### Contract Testing

```bash
# Using Dredd
dredd docs/openapi.yaml http://localhost:8080

# Using Pact
# See: https://docs.pact.io/implementation_guides/javascript/docs/matching
```

### Validation

```bash
# Validate the OpenAPI spec
npx @apidevtools/swagger-cli validate docs/openapi.yaml
```

---

> **Note:** The frontend and backend will be developed in separate repositories. Both projects will start independently, guided by the API contract and specification, and will be integrated later.
