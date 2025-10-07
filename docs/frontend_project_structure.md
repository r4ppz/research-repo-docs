# Research Repository — Frontend Structure & Implementation Guide

**Version:** V3  
**Date:** 2025-10-07  
**Status:** Canonical — This is the single source of truth for frontend structure.

---

## Philosophy: Why This Structure Exists

1. **Future-proofing:** When backend is ready, you swap `services/mock/` for `services/api/`. Components don't change.
2. **Role isolation:** Student, Admin, SuperAdmin features are decoupled. Delete one, nothing breaks.
3. **No prop-drilling hell:** Context for auth, custom hooks for data fetching.
4. **Type safety:** TypeScript strict mode catches bugs at compile time, not in production.
5. **CSS sanity:** CSS Modules prevent style collisions; global variables keep design tokens consistent.

---

## Tech Stack

| Layer     | Tool                        | Why                                                   |
| --------- | --------------------------- | ----------------------------------------------------- |
| Build     | Vite                        | Fast. Modern. No Webpack config hell.                 |
| Language  | TypeScript (strict)         | Catch bugs before runtime. Self-documenting code.     |
| Framework | React 18                    | De facto standard. Hooks are clean.                   |
| Routing   | React Router v6             | Industry standard. Good DX.                           |
| HTTP      | Axios                       | Better than fetch (interceptors, auto-JSON, timeout). |
| Auth      | Google Identity Services    | Specified in contract. Backend verifies.              |
| Styling   | CSS Modules + CSS Variables | Scoped styles. No runtime cost. No Tailwind bloat.    |
| Linting   | ESLint + Prettier           | Code consistency. Auto-format on save.                |

**No state management library** (Redux, Zustand, etc.) until you need it. Context + hooks are sufficient for this app's complexity.

---

## Canonical Folder Structure

```
research-repository/
├─ public/
│  ├─ favicon.ico
│  └─ logo.png
│
├─ src/
│  ├─ assets/                    # Static files (images, icons, fonts)
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
│  │  ├─ Header/
│  │  ├─ Footer/
│  │  └─ index.ts               # Re-export all components
│  │
│  ├─ features/                  # Domain modules (self-contained, deletable)
│  │  ├─ auth/
│  │  │  ├─ components/
│  │  │  │  └─ LoginButton.tsx
│  │  │  ├─ context/
│  │  │  │  └─ AuthContext.tsx
│  │  │  ├─ hooks/
│  │  │  │  └─ useAuth.ts
│  │  │  └─ types.ts
│  │  │
│  │  ├─ library/               # Shared "Library" page (all roles see this)
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
│  ├─ services/                  # API layer (centralized, swappable)
│  │  ├─ api/                    # Real API implementation (when backend ready)
│  │  │  ├─ apiClient.ts         # Axios instance + interceptors
│  │  │  ├─ authApi.ts
│  │  │  ├─ papersApi.ts
│  │  │  ├─ requestsApi.ts
│  │  │  ├─ adminApi.ts
│  │  │  └─ index.ts
│  │  │
│  │  └─ mock/                   # Mock API (development only)
│  │     ├─ mockApiClient.ts
│  │     ├─ mockAuthApi.ts
│  │     ├─ mockPapersApi.ts
│  │     ├─ mockRequestsApi.ts
│  │     ├─ mockAdminApi.ts
│  │     ├─ mockData.ts          # Static mock data
│  │     └─ index.ts
│  │
│  ├─ hooks/                     # Global reusable hooks (NOT feature-specific)
│  │  ├─ useLocalStorage.ts
│  │  ├─ useDebounce.ts
│  │  ├─ usePagination.ts
│  │  └─ useAsync.ts
│  │
│  ├─ routes/
│  │  ├─ AppRouter.tsx           # Main router component
│  │  ├─ ProtectedRoute.tsx      # Auth guard wrapper
│  │  └─ routes.tsx              # Route config (role-based)
│  │
│  ├─ types/                     # Global shared types (mirrors API contract)
│  │  ├─ user.ts
│  │  ├─ research.ts
│  │  ├─ api.ts
│  │  └─ index.ts
│  │
│  ├─ utils/                     # Pure utility functions
│  │  ├─ formatDate.ts
│  │  ├─ formatters.ts
│  │  ├─ validators.ts
│  │  └─ constants.ts
│  │
│  ├─ styles/                    # Global CSS
│  │  ├─ variables.css           # Design tokens (colors, spacing, etc.)
│  │  ├─ reset.css               # CSS reset
│  │  └─ globals.css             # Global styles + utilities
│  │
│  ├─ App.tsx                    # Root app component
│  ├─ main.tsx                   # Vite entry point
│  └─ vite-env.d.ts              # Vite TypeScript declarations
│
├─ .env.example                  # Environment variables template
├─ .eslintrc.cjs                 # ESLint config
├─ .prettierrc                   # Prettier config
├─ tsconfig.json                 # TypeScript config
├─ tsconfig.node.json            # TypeScript config for Vite
├─ vite.config.ts                # Vite config
└─ package.json
```

---

## Folder Responsibilities (The Contract)

### **`components/`** — Pure UI Primitives

**Rules:**

- NO business logic.
- NO API calls.
- NO feature-specific logic.
- Props-only interface.
- Fully reusable across features.

**Examples:**

- `Button` — onClick handler, variants (primary/secondary/danger), sizes
- `Input` — onChange, validation state, label, error message
- `Modal` — isOpen, onClose, children
- `Table` — columns config, data array, onSort, onPageChange
- `Badge` — text, variant (success/warning/danger)

**Anti-pattern:**

```tsx
// ❌ WRONG — This belongs in features/library/components/
function ResearchCard({ paper, onRequestAccess }) {
  return <Card onClick={() => onRequestAccess(paper.id)}>...</Card>;
}
```

**Correct pattern:**

```tsx
// ✅ RIGHT — Pure component
function Card({ children, onClick, className }) {
  return (
    <div className={styles.card} onClick={onClick}>
      {children}
    </div>
  );
}
```

---

### **`features/`** — Domain Modules

**Rules:**

- Each feature is **self-contained**.
- Deleting a feature folder should not break other features.
- Features can import from `components/`, `types/`, `services/`, `hooks/`, `utils/`.
- Features **cannot** import from other features (except `library` since it's shared).

**Structure per feature:**

```
features/student/
  ├─ components/       # Student-specific UI (RequestTable, DownloadButton)
  ├─ hooks/            # Student-specific hooks (useStudentRequests)
  ├─ pages/            # Full page components (StudentRequestsPage)
  └─ types.ts          # Student-specific types (if needed)
```

**Shared vs Feature-Specific Decision Tree:**

| Question                         | Answer | Location                                                                |
| -------------------------------- | ------ | ----------------------------------------------------------------------- |
| Used by 2+ features?             | Yes    | `features/library/` (if research-related) or `components/` (if pure UI) |
| Contains feature-specific logic? | Yes    | `features/{role}/components/`                                           |
| Pure UI with no domain logic?    | Yes    | `components/`                                                           |

**Example: ResearchCard**

- Shows paper metadata (title, author, abstract).
- Used by Library (all roles), Student (requests page), Admin (management).
- **Location:** `features/library/components/ResearchCard/`
- **Why:** Domain-specific (research papers) but shared across roles.

---

### **`services/`** — API Layer

**Rules:**

- One function per API endpoint.
- Never call Axios directly from components.
- Always typed (input params + return type).
- Mock and real API must have **identical interfaces**.

**Structure:**

```
services/
  ├─ api/            # Real API (use when backend ready)
  │  ├─ apiClient.ts # Axios instance + interceptors (JWT injection, error handling)
  │  ├─ authApi.ts   # POST /api/auth/google, GET /api/users/me
  │  ├─ papersApi.ts # GET /api/papers, GET /api/papers/:id
  │  └─ ...
  │
  └─ mock/           # Mock API (use during development)
     ├─ mockData.ts  # Static mock data
     └─ mockAuthApi.ts, mockPapersApi.ts, etc.
```

**Real API Example:**

```ts
// services/api/papersApi.ts
import { apiClient } from "./apiClient";
import type { ResearchPaper, Page } from "@/types";

export const papersApi = {
  getPapers: async (params?: {
    page?: number;
    size?: number;
    departmentId?: number;
    archived?: boolean;
  }): Promise<Page<ResearchPaper>> => {
    const { data } = await apiClient.get("/api/papers", { params });
    return data;
  },

  getPaperById: async (id: number): Promise<ResearchPaper> => {
    const { data } = await apiClient.get(`/api/papers/${id}`);
    return data;
  },
};
```

**Mock API Example (same interface):**

```ts
// services/mock/mockPapersApi.ts
import { getMockPapers } from "./mockData";
import type { ResearchPaper, Page } from "@/types";

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockPapersApi = {
  getPapers: async (params?: {
    page?: number;
    size?: number;
    departmentId?: number;
    archived?: boolean;
  }): Promise<Page<ResearchPaper>> => {
    await delay();
    const papers = getMockPapers(params?.archived, params?.departmentId);
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    return {
      content: papers.slice(page * size, (page + 1) * size),
      totalElements: papers.length,
      totalPages: Math.ceil(papers.length / size),
      number: page,
      size,
    };
  },

  getPaperById: async (id: number): Promise<ResearchPaper> => {
    await delay();
    const paper = getMockPapers().find((p) => p.paperId === id);
    if (!paper) throw new Error("Paper not found");
    return paper;
  },
};
```

**Swapping Mock for Real:**

```ts
// services/index.ts
import { papersApi } from "./api/papersApi";
import { mockPapersApi } from "./mock/mockPapersApi";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const api = {
  papers: USE_MOCK ? mockPapersApi : papersApi,
  // ... other services
};
```

**Components use `api` — don't care if mock or real:**

```tsx
import { api } from "@/services";

const papers = await api.papers.getPapers();
```

---

### **`types/`** — Global Type Definitions

**Rules:**

- These types **mirror the API contract exactly**.
- They are the **single source of truth** for data shapes.
- Never duplicate types across files.

**Files:**

```
types/
  ├─ user.ts       # User, Role, Department
  ├─ research.ts   # ResearchPaper, DocumentRequest, RequestStatus
  ├─ api.ts        # Page<T>, AuthResponse, ApiError
  └─ index.ts      # Re-export all types
```

**Example (`types/user.ts`):**

```ts
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

**Why no DTOs?**

- The API already returns camelCase JSON (per spec).
- No transformation needed.
- These types ARE your DTOs.

**If backend sent snake_case**, you'd do this:

```ts
// services/api/transformers.ts
interface UserDTO {
  user_id: number;
  full_name: string;
  // ...
}

export const toUser = (dto: UserDTO): User => ({
  userId: dto.user_id,
  fullName: dto.full_name,
  // ...
});
```

But you don't need this. Your API is already clean.

---

### **`hooks/`** — Global Reusable Hooks

**Rules:**

- Generic, reusable logic (NOT feature-specific).
- No direct API calls (use services).
- Examples: debouncing, local storage, pagination.

**Examples:**

```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Feature-specific hooks go in `features/{role}/hooks/`:**

```tsx
// features/student/hooks/useStudentRequests.ts
import { useState, useEffect } from "react";
import { api } from "@/services";
import type { DocumentRequest } from "@/types";

export function useStudentRequests() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.requests
      .getMyRequests()
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { requests, loading, error };
}
```

---

### **`routes/`** — Routing & Guards

**Files:**

```
routes/
  ├─ AppRouter.tsx       # Main router component
  ├─ ProtectedRoute.tsx  # Auth + role guard wrapper
  └─ routes.tsx          # Route configuration
```

**Route Config (`routes/routes.tsx`):**

```tsx
import { LibraryPage } from "@/features/library/pages/LibraryPage";
import { StudentRequestsPage } from "@/features/student/pages/StudentRequestsPage";
import { AdminRequestsPage } from "@/features/departmentAdmin/pages/AdminRequestsPage";
// ...

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
  // ...
];
```

**Protected Route (`routes/ProtectedRoute.tsx`):**

```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Role } from "@/types";

interface Props {
  element: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ element, roles }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{element}</>;
}
```

**App Router (`routes/AppRouter.tsx`):**

```tsx
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

## Authentication Flow

### **Setup:**

1. User clicks "Sign in with Google" button.
2. Frontend uses Google Identity Services to get ID token.
3. Frontend sends token to `POST /api/auth/google`.
4. Backend verifies token, creates/updates user, issues JWT.
5. Frontend stores JWT (in-memory for MVP, later consider httpOnly cookie).
6. Frontend calls `GET /api/users/me` to hydrate user state.
7. AuthContext provides user to entire app.

### **AuthContext (`features/auth/context/AuthContext.tsx`):**

```tsx
import { createContext, useState, useEffect, ReactNode } from "react";
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
    // On mount, try to restore session
    api.auth
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (googleToken: string) => {
    const { jwt, user } = await api.auth.login(googleToken);
    // Store JWT (in-memory for now)
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

### **useAuth Hook (`features/auth/hooks/useAuth.ts`):**

```tsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

---

## File Naming Conventions

| Type       | Convention                       | Example                 |
| ---------- | -------------------------------- | ----------------------- |
| Component  | PascalCase                       | `ResearchCard.tsx`      |
| Hook       | camelCase with `use` prefix      | `useResearchPapers.ts`  |
| Context    | PascalCase with `Context` suffix | `AuthContext.tsx`       |
| Type       | PascalCase                       | `User`, `ResearchPaper` |
| Utility    | camelCase                        | `formatDate.ts`         |
| CSS Module | `{Component}.module.css`         | `Button.module.css`     |
| Constant   | SCREAMING_SNAKE_CASE             | `API_BASE_URL`          |

---

## Import Order (Enforced by ESLint)

```tsx
// 1. External dependencies
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Internal absolute imports (using @/ alias)
import { Button, Modal } from "@/components";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { api } from "@/services";
import type { User, ResearchPaper } from "@/types";

// 3. Relative imports
import { ResearchCard } from "../components/ResearchCard";
import styles from "./LibraryPage.module.css";
```

---

## TypeScript Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting (STRICT) */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

---

## Environment Variables (`.env.example`)

```bash
# Use mock API (true) or real backend (false)
VITE_USE_MOCK=true

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# API Base URL (if not using Vite proxy)
VITE_API_BASE_URL=http://localhost:8080
```

---

## Summary: The Golden Rules

1. **Components are dumb.** No API calls, no business logic. Props in, JSX out.
2. **Features are isolated.** Delete one, nothing breaks.
3. **Services are the API boundary.** Components never touch Axios directly.
4. **Types mirror the API contract.** No divergence allowed.
5. **Mock and real APIs have identical interfaces.** Swap them with one line.
6. **CSS Modules for components, CSS Variables for design tokens.** No global class conflicts.
7. **Strict TypeScript.** If it compiles, it probably works.
8. **AuthContext for user state.** No prop drilling.
9. **Role-based routing.** Guard everything.
10. **When in doubt, ask: "Can I delete this folder without breaking other folders?"** If no, refactor.
