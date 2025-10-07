# Research Repository — Frontend Structure & Implementation Guide

Version: V3
Date: 2025-10-07
Status: Canonical — Single source of truth for frontend structure.

---

## Philosophy

- Future-proof: Swap services/mock for services/api without touching components.
- Modular: Features are self-contained; delete one, the rest stands.
- Typed: Strict TypeScript across the board.
- No prop-drilling: Context for session, hooks for data.
- CSS sanity: CSS Modules per component; CSS variables for tokens.

---

## Tech Stack

| Layer     | Tool                        | Why                                    |
| --------- | --------------------------- | -------------------------------------- |
| Build     | Vite                        | Fast, modern, zero Webpack yak-shaving |
| Language  | TypeScript (strict)         | Catch bugs at compile-time             |
| Framework | React 18                    | Hooks, ecosystem, stability            |
| Routing   | React Router v6             | Battle-tested                          |
| HTTP      | Axios                       | Interceptors, timeouts, typed generics |
| Auth      | Google Identity Services    | Per backend contract                   |
| Styling   | CSS Modules + CSS Variables | Scoped styles, no runtime tax          |
| Linting   | ESLint + Prettier           | Consistency, auto-format               |

No global state library (Redux/Zustand) until there’s clear value. Context + hooks are enough.

---

## Canonical Folder Structure

```
research-repository/
├─ public/
│  ├─ favicon.ico
│  └─ logo.png
│
├─ src/
│  ├─ assets/
│  │  ├─ images/
│  │  └─ icons/
│  │
│  ├─ components/                # Pure UI primitives (no business logic)
│  │  ├─ Button/
│  │  │  ├─ Button.tsx
│  │  │  ├─ Button.module.css
│  │  │  └─ index.ts
│  │  ├─ Input/
│  │  ├─ Modal/
│  │  ├─ Table/
│  │  ├─ Badge/
│  │  ├─ Header/
│  │  ├─ Footer/
│  │  └─ index.ts
│  │
│  ├─ features/                  # Domain modules (self-contained)
│  │  ├─ auth/
│  │  │  ├─ components/
│  │  │  │  └─ LoginButton.tsx
│  │  │  ├─ context/
│  │  │  │  └─ AuthContext.tsx   # Context lives here
│  │  │  ├─ hooks/
│  │  │  │  └─ useAuth.ts
│  │  │  └─ types.ts
│  │  │
│  │  ├─ library/                # Shared research UI across roles
│  │  │  ├─ components/
│  │  │  │  ├─ ResearchCard/
│  │  │  │  ├─ ResearchModal/
│  │  │  │  ├─ ResearchList/
│  │  │  │  └─ FilterBar/
│  │  │  ├─ hooks/
│  │  │  │  └─ useResearchPapers.ts
│  │  │  ├─ pages/
│  │  │  │  └─ LibraryPage.tsx
│  │  │  └─ types.ts
│  │  │
│  │  ├─ student/
│  │  │  ├─ components/
│  │  │  │  ├─ RequestTable/
│  │  │  │  └─ RequestActionButton/
│  │  │  ├─ hooks/
│  │  │  │  └─ useStudentRequests.ts
│  │  │  ├─ pages/
│  │  │  │  └─ StudentRequestsPage.tsx
│  │  │  └─ types.ts
│  │  │
│  │  ├─ departmentAdmin/
│  │  │  ├─ components/
│  │  │  │  ├─ RequestManagementTable/
│  │  │  │  ├─ PaperForm/
│  │  │  │  ├─ PaperManagementTable/
│  │  │  │  └─ ArchiveToggle/
│  │  │  ├─ hooks/
│  │  │  │  ├─ useAdminRequests.ts
│  │  │  │  └─ usePaperManagement.ts
│  │  │  ├─ pages/
│  │  │  │  ├─ AdminRequestsPage.tsx
│  │  │  │  └─ PapersManagementPage.tsx
│  │  │  └─ types.ts
│  │  │
│  │  └─ superAdmin/
│  │     ├─ components/
│  │     │  ├─ DepartmentFilter/
│  │     │  ├─ GlobalStatsCard/
│  │     │  └─ BulkActionBar/
│  │     ├─ hooks/
│  │     │  └─ useSuperAdminData.ts
│  │     ├─ pages/
│  │     │  ├─ SuperAdminRequestsPage.tsx
│  │     │  └─ SuperAdminPapersPage.tsx
│  │     └─ types.ts
│  │
│  ├─ services/                  # API boundary (swappable mock/real)
│  │  ├─ api/                    # Real API impl (when backend ready)
│  │  │  ├─ apiClient.ts         # Axios instance + interceptors
│  │  │  ├─ authApi.ts
│  │  │  ├─ papersApi.ts
│  │  │  ├─ requestsApi.ts
│  │  │  ├─ adminApi.ts
│  │  │  └─ index.ts
│  │  └─ mock/                   # Mock API (dev)
│  │     ├─ mockApiClient.ts
│  │     ├─ mockAuthApi.ts
│  │     ├─ mockPapersApi.ts
│  │     ├─ mockRequestsApi.ts
│  │     ├─ mockAdminApi.ts
│  │     ├─ mockData.ts
│  │     └─ index.ts
│  │
│  ├─ hooks/                     # Global reusable hooks (generic)
│  │  ├─ useLocalStorage.ts
│  │  ├─ useDebounce.ts
│  │  ├─ usePagination.ts
│  │  └─ useAsync.ts
│  │
│  ├─ routes/
│  │  ├─ AppRouter.tsx
│  │  ├─ ProtectedRoute.tsx
│  │  └─ routes.tsx
│  │
│  ├─ types/                     # Global types (mirror API)
│  │  ├─ user.ts
│  │  ├─ research.ts
│  │  ├─ api.ts
│  │  └─ index.ts
│  │
│  ├─ utils/
│  │  ├─ formatDate.ts
│  │  ├─ formatters.ts
│  │  ├─ validators.ts
│  │  └─ constants.ts
│  │
│  ├─ styles/
│  │  ├─ variables.css
│  │  ├─ reset.css
│  │  └─ globals.css
│  │
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ vite-env.d.ts
│
├─ .env.example
├─ .eslintrc.cjs
├─ .prettierrc
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ package.json
```

---

## Context Placement

- Feature-owned contexts live inside that feature.
  - AuthContext → `src/features/auth/context/AuthContext.tsx`
- Create `src/context/` ONLY for cross-cutting concerns that are not owned by a single feature (e.g., ThemeContext, I18nContext).
- Always expose contexts via a custom hook (e.g., `useAuth`) to keep a clean public API.

Example usage from any feature:

```tsx
import { useAuth } from "@/features/auth/hooks/useAuth";

const { user, login, logout } = useAuth();
```

---

## Folder Responsibilities

### components/ — Pure UI primitives

- No business logic, no API calls, no role/domain coupling.
- Examples: Button, Input, Modal, Table, Badge, Header, Footer.

Anti-pattern (don’t do this in components/):

```tsx
// ❌ Domain logic in a primitive
function ResearchCard({ paper, onApprove }) {
  /* ... */
}
```

### features/ — Domain modules

- Self-contained: pages, domain components, hooks, local types.
- Can import from components, services, hooks, utils, types.
- Must not import from other feature folders (except shared "library" feature, which is explicitly for cross-role research UI).

### services/ — API boundary

- Centralized interface for all network I/O.
- Real and mock implementations share the same shape. Toggle via env.

### hooks/ — Global generic hooks

- Reusable utilities (debounce, pagination, local storage).
- Feature-specific hooks belong under that feature.

### types/ — Global types

- Mirror API contract exactly (camelCase).
- Single source of truth for DTOs.

---

## Services: Mock vs Real

Shared service interface:

```ts
// services/index.ts
import { authApi } from "./api/authApi";
import { papersApi } from "./api/papersApi";
import { requestsApi } from "./api/requestsApi";
import { adminApi } from "./api/adminApi";

import { mockAuthApi } from "./mock/mockAuthApi";
import { mockPapersApi } from "./mock/mockPapersApi";
import { mockRequestsApi } from "./mock/mockRequestsApi";
import { mockAdminApi } from "./mock/mockAdminApi";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const api = {
  auth: USE_MOCK ? mockAuthApi : authApi,
  papers: USE_MOCK ? mockPapersApi : papersApi,
  requests: USE_MOCK ? mockRequestsApi : requestsApi,
  admin: USE_MOCK ? mockAdminApi : adminApi,
};
```

Axios instance with JWT:

```ts
// services/api/apiClient.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/",
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const jwt = sessionStorage.getItem("jwt");
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});
```

---

## Types (mirror API)

```ts
// types/user.ts
export type Role = "STUDENT" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";

export interface Department {
  departmentId: number;
  departmentName: string;
}

export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  department: Department | null;
}
```

```ts
// types/research.ts
export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface ResearchPaper {
  paperId: number;
  title: string;
  authorName: string;
  abstractText: string;
  department: Department;
  submissionDate: string; // YYYY-MM-DD
  fileUrl: string;
  archived: boolean;
  archivedAt?: string | null;
}

export interface DocumentRequest {
  requestId: number;
  status: RequestStatus;
  requestDate: string; // ISO datetime
  paper: ResearchPaper;
  requester: User;
}
```

```ts
// types/api.ts
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
  traceId?: string;
}
```

---

## Auth

AuthContext lives in `features/auth/context`.

```tsx
// features/auth/context/AuthContext.tsx
import { createContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/services";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (googleToken: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (googleToken: string) => {
    const { jwt, user } = await api.auth.login(googleToken);
    sessionStorage.setItem("jwt", jwt);
    setUser(user);
  };

  const logout = () => {
    sessionStorage.removeItem("jwt");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

```ts
// features/auth/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

Wrap the app:

```tsx
// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
```

---

## Routing & Guards

```tsx
// routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Role } from "@/types";

export function ProtectedRoute({
  element,
  roles,
}: {
  element: React.ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{element}</>;
}
```

```tsx
// routes/routes.tsx
import type { Role } from "@/types";
import { LibraryPage } from "@/features/library/pages/LibraryPage";
import { StudentRequestsPage } from "@/features/student/pages/StudentRequestsPage";
import { AdminRequestsPage } from "@/features/departmentAdmin/pages/AdminRequestsPage";
import { PapersManagementPage } from "@/features/departmentAdmin/pages/PapersManagementPage";

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  roles?: Role[];
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <LibraryPage />,
    roles: ["STUDENT", "DEPARTMENT_ADMIN", "SUPER_ADMIN"],
  },
  {
    path: "/student/requests",
    element: <StudentRequestsPage />,
    roles: ["STUDENT"],
  },
  {
    path: "/admin/requests",
    element: <AdminRequestsPage />,
    roles: ["DEPARTMENT_ADMIN", "SUPER_ADMIN"],
  },
  {
    path: "/admin/papers",
    element: <PapersManagementPage />,
    roles: ["DEPARTMENT_ADMIN", "SUPER_ADMIN"],
  },
];
```

```tsx
// routes/AppRouter.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { routes } from "./routes";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map(({ path, element, roles }) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute element={element} roles={roles} />}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Global Hooks (examples)

```ts
// hooks/useLocalStorage.ts
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
```

```ts
// hooks/useDebounce.ts
import { useEffect, useState } from "react";
export function useDebounce<T>(value: T, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
```

---

## Styling

- CSS Modules per component: `Component.module.css`
- Global tokens in `styles/variables.css`
- Import `styles/globals.css` once in `main.tsx`

Example:

```css
/* components/Button/Button.module.css */
.button {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: 0.2s ease;
}

.primary {
  background: var(--color-primary);
  color: #fff;
}
.primary:hover {
  background: var(--color-primary-hover);
}
```

---

## TypeScript Config (strict)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Vite Config

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 3000,
    proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } },
  },
});
```

---

## Environment Variables (.env.example)

```bash
# Use mock API (true) or real backend (false)
VITE_USE_MOCK=true

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# API Base URL (leave unset if using Vite proxy)
VITE_API_BASE_URL=http://localhost:8080
```

---

## Golden Rules

1. Components are dumb: no API calls, no domain logic.
2. Features are isolated: deleting a feature doesn’t break others.
3. Services are the only API boundary: components use `api.*` only.
4. Types mirror the backend contract exactly.
5. Mock and real services share the same interface; swap via env.
6. CSS Modules + tokens; no global class leakage.
7. Use Context sparingly; keep it in the owning feature.
8. Guard routes by role; never trust the UI for authz.
9. If a folder can’t be deleted without cross-feature fallout, refactor.
10. Prefer simple, composable pieces over clever abstractions.

---
