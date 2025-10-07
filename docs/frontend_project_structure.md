# Research Repository — Frontend Project Structure (V1)

Version: 2025-10-07  
Audience: Frontend devs  
Status: V1 — First version. Still a developer choice. You may evolve this as you code, but keep types/contracts in sync with main spec.

---

## Recommended Structure

```
src/
├─ app/              # App bootstrap (main.tsx, App.tsx, router.tsx)
├─ pages/            # Route-level screens (Library, Requests, Research)
├─ components/       # Reusable building blocks
│  ├─ layout/        # Navbar, ProtectedRoute, etc.
│  ├─ ui/            # Button, input, etc.
│  └─ domain/        # ResearchCard, RequestRow, etc.
├─ api/              # API wrapper functions (mock + real)
│  ├─ index.ts
│  ├─ mock/
│  └─ real/
├─ types/            # domain.ts (authoritative TS types; keep in sync with main spec)
├─ mocks/            # dummyData.ts (dev-only, realistic objects)
├─ context/          # UserContext or AuthContext (for mock/dev phase)
├─ hooks/            # useRole, useApi, etc.
├─ lib/              # config (USE_MOCKS toggle), download helper, etc.
├─ styles/           # globals.css, tokens.css
└─ assets/           # Logo, pdf icon, etc.
```

---

## Key Principles

- All contract types live in `src/types/domain.ts` and match the main spec exactly.
- Dummy/mock data is realistic, typed, and lives in `src/mocks/`.
- All API calls go through `src/api/index.ts` (swap mock/real with a config flag).
- Role-based UI logic lives in hooks/components, not spread through pages.
- CSS Modules for components. Keep global CSS minimal.

---

## Getting Started

1. Scaffold folders as above.
2. Put contract types in `src/types/domain.ts`.
3. Add some mock data in `src/mocks/dummyData.ts` for dev.
4. Build API wrapper functions; start with mock implementations.
5. Use a context/provider for user/auth during dev.
6. Use role-based guards in routing.
7. When backend lands, flip to real API layer.

---

## Evolving Structure

- As you add features, split domain widgets or utility hooks into their own folders.
- Keep contract types and API payloads synced with the main spec.
- If you change types or API, update the spec first.

---

## Docs

- Put README.md and any onboarding docs in project root.
- Reference the main spec and API contract as your source of truth.
