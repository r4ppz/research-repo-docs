# Research Repository — Frontend Project Structure (V2)

Version: V2 - 2025-10-07

A future-proof, scalable, and idiomatic **React + TypeScript (Vite)** project structure.

---

## Stack & Tools

- **Vite** (React + TypeScript)
- **React Router**
- **Axios** for API requests
- **Google SSO** for authentication
- **CSS Modules** + global variables.css (no UI libraries)
- **ESLint + Prettier + Strict TypeScript**
- **Folder aliases:** `@/` for `src/`

---

## Folder Structure

```

research-repository/
├─ public/
│ ├─ favicon.ico
│ ├─ manifest.json
│ └─ logo.png
│
├─ src/
│ ├─ assets/ # Static images, SVGs, icons
│ │ ├─ images/
│ │ └─ icons/
│ │
│ ├─ components/ # Reusable, presentational UI elements
│ │ ├─ common/
│ │ │ ├─ Button/
│ │ │ │ ├─ Button.tsx
│ │ │ │ └─ Button.module.css
│ │ │ ├─ Input/
│ │ │ ├─ Header/
│ │ │ ├─ Footer/
│ │ │ └─ ProfileButton/
│ │ │
│ │ ├─ research/ # Domain-specific UI (e.g. ResearchCard)
│ │ │ ├─ ResearchCard/
│ │ │ └─ ResearchList/
│ │ │
│ │ └─ index.ts # Re-export components for cleaner imports
│ │
│ ├─ features/ # Role- or domain-based modules (Clean Architecture style)
│ │ ├─ auth/
│ │ │ ├─ components/
│ │ │ ├─ hooks/
│ │ │ ├─ pages/
│ │ │ ├─ services/
│ │ │ └─ types.ts
│ │ │
│ │ ├─ student/
│ │ │ ├─ pages/
│ │ │ ├─ components/
│ │ │ ├─ services/
│ │ │ └─ types.ts
│ │ │
│ │ ├─ departmentAdmin/
│ │ │ ├─ pages/
│ │ │ ├─ components/
│ │ │ ├─ services/
│ │ │ └─ types.ts
│ │ │
│ │ └─ superAdmin/
│ │ ├─ pages/
│ │ ├─ components/
│ │ ├─ services/
│ │ └─ types.ts
│ │
│ ├─ pages/ # Public or shared routes (non-role)
│ │ ├─ Home/
│ │ ├─ NotFound/
│ │ └─ index.ts
│ │
│ ├─ routes/ # All routing and guards
│ │ ├─ AppRouter.tsx # Central route management
│ │ ├─ ProtectedRoute.tsx # Auth guard
│ │ └─ routeConfig.ts # Role-based route configuration
│ │
│ ├─ hooks/ # Global reusable hooks
│ │ ├─ useAuth.ts
│ │ ├─ useAxios.ts
│ │ └─ useRole.ts
│ │
│ ├─ services/ # API layer
│ │ ├─ apiClient.ts # axios instance + interceptors
│ │ ├─ userService.ts
│ │ ├─ researchService.ts
│ │ └─ types.ts
│ │
│ ├─ context/ # React Context API providers
│ │ ├─ AuthContext.tsx
│ │ └─ RoleContext.tsx
│ │
│ ├─ utils/ # Small reusable helpers
│ │ ├─ formatDate.ts
│ │ ├─ constants.ts
│ │ ├─ roleUtils.ts
│ │ └─ validation.ts
│ │
│ ├─ styles/ # Global styling
│ │ ├─ variables.css
│ │ ├─ globals.css
│ │ └─ reset.css
│ │
│ ├─ types/ # Global shared TypeScript interfaces
│ │ ├─ user.ts
│ │ ├─ research.ts
│ │ └─ index.ts
│ │
│ ├─ App.tsx
│ ├─ main.tsx
│ └─ vite-env.d.ts
│
├─ .eslintrc.cjs
├─ .prettierrc
├─ tsconfig.json
├─ tsconfig.node.json
└─ package.json

```

---

## Folder Purposes

| Folder          | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| **components/** | Pure, stateless, reusable UI pieces (buttons, cards, forms).               |
| **features/**   | Modular areas of the app grouped by role or domain (auth, student, admin). |
| **pages/**      | Full page views used directly by the router.                               |
| **routes/**     | Contains main router setup, route guards, and role-based configs.          |
| **hooks/**      | Reusable logic such as authentication, role, or axios instance.            |
| **services/**   | Axios API layer (no direct API calls inside components).                   |
| **context/**    | React context for auth/session/global state.                               |
| **utils/**      | Helpers and utility functions (formatting, constants, validators).         |
| **styles/**     | Global CSS (variables, resets, and themes).                                |
| **types/**      | Centralized shared TypeScript types/interfaces.                            |

---

## Authentication (Google SSO)

- **`AuthContext.tsx`** stores the logged-in user and JWT.
- **`useAuth()`** provides login/logout and user data access.
- **`ProtectedRoute.tsx`** guards routes requiring authentication.
- Tokens verified by backend; frontend stores minimal session data securely.

---

## TypeScript & Coding Standards

- Enable strict mode (`"strict": true` in `tsconfig.json`).
- Use small, strongly typed modules.
- Example typed API call:

  ```ts
  import { apiClient } from "@/services/apiClient";
  import type { User } from "@/types/user";

  export const getUser = async (): Promise<User> => {
    const { data } = await apiClient.get<User>("/user/me");
    return data;
  };
  ```

- Prefer **feature-based imports** using `@/` alias:

  ```ts
  import { Button } from "@/components/common/Button";
  import { useAuth } from "@/hooks/useAuth";
  ```

---

## Role-Based Routing Example

| Role                 | Example Pages                                                 |
| -------------------- | ------------------------------------------------------------- |
| **STUDENT**          | `/student/request` — Submit research requests                 |
| **DEPARTMENT_ADMIN** | `/department/manage-requests` — Approve/deny student requests |
| **SUPER_ADMIN**      | `/super-admin/users` — Manage departments and users           |

All roles share `/home`, but differ in navigation headers.

---

## Development Conventions

- Keep components small, composable, and typed.
- Never call `axios` directly in a component — always use a service file.
- Use `.module.css` per component for scoped styles.
- Enforce formatting:

  ```bash
  npm run lint
  npm run format
  ```

- Commit meaningful and scoped messages (e.g., `feat(auth): add Google login`).

---

## Philosophy

> Keep it **modular**, **typed**, and **isolated**.
> Each folder should feel replaceable without breaking the rest of the app.
> Structure now = freedom later.
