# XYZ Platform - Frontend

This is the frontend single-page application (SPA) for the **XYZ Platform**, a LeetCode-inspired coding practice and judge system. 

It is built with React 19, Vite, TailwindCSS, Monaco Editor, and TanStack Query, presenting a high-performance, dark-themed, and responsive developer workflow.

---

## 🚀 Quick Start

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Run Development Server
Start the development server on `http://localhost:5173`:
```bash
npm run dev
```

> [!NOTE]
> The dev server binds to port **5173** by default. If it binds to a different port, update the `CORS_ORIGINS` in your `backend/.env` file.

### 3. Production Build
Build the application for production:
```bash
npm run build
```
This generates the optimized static assets in the `/dist` directory.

### 4. Local Production Preview
Preview the production build locally:
```bash
npm run preview
```

---

## 🛠️ CLI Tooling & Quality Assurance

Ensure code quality, typing safety, and linting compliance with these commands:

| Command | Action |
|---------|--------|
| `npm run lint` | Runs ESLint analysis across the source files. |
| `npm run typecheck` | Validates TypeScript types compile without emitting files (`tsc --noEmit`). |
| `npm run build` | Performs the full TypeScript check (`tsc -b`) and bundles with Vite. |

---

## 📁 Project Architecture

The codebase follows a feature-centric structure designed for scalability and maintainability:

```text
frontend/src/
├── app/               # Routing (router.tsx) and Global Entry Providers
├── assets/            # Static assets and media
├── features/          # Feature domains containing UI pages and components
│   ├── admin/         # Admin Panel, Problem Form, Tag Picker
│   ├── auth/          # Authentication Providers, Forms, Login, Register, Profile Settings
│   ├── leaderboard/   # Rankings and weekly/all-time leaderboards
│   ├── problems/      # Workspace, Code Editor (Monaco), Catalog Table, Submissions
│   └── profile/       # User profile details, Stats Cards, submissions log
├── shared/            # Shared primitives, assets, hooks, and helpers
│   ├── lib/           # API Client (api.ts) and environment setups
│   └── ui/            # UI components (Button, Input, Select, Modal, Toast, Table Shells)
└── main.tsx           # Application entry point
```

---

## 🎨 Design Rules & Visual Tone

To preserve the premium developer tool aesthetic, adhere to the following design conventions:
- **Palette**: Dark Mode by default. We use custom dark tones (background `#0B0F19`, panel `#151B26`, border `#242F41`) with vibrant accent colors (Blue `#3B82F6`, Emerald `#10B981`, Amber `#F59E0B`, Rose `#EF4444`).
- **Borders**: Standard border-radius is `8px` (`rounded-lg`) or less. Avoid rounded pill shapes for action panels.
- **Monaco Editor**: Integrated for code entry using `@monaco-editor/react`. Configured to match the dark theme and handle Python and JavaScript with local draft caching.
- **UX States**: Every network request displays corresponding skeletons (`TableSkeleton`) or loading loaders, keeping layouts stable.

---

## 🔌 API Client & Integration

All communication with the backend is managed by the API client in [api.ts](file:///c:/Users/mannu/OneDrive/문서/fancy-todo-list/xyz_plateform/frontend/src/shared/lib/api.ts).
- Integrates automatically with the authentication session using authorization header injection.
- Normalizes all server responses and parses FastAPI field errors dynamically.
- Automatically handles **429 (Too Many Requests)** rate limits and fires a session expiration event on **401 Unauthorized** triggers.
