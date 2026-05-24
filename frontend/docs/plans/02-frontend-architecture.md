# Frontend Architecture

## Stack

Use the locked v1 stack from the backend docs, with TypeScript as the implementation default.

| Concern | Choice |
| --- | --- |
| App framework | React 18 + Vite |
| Language | TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS with app-level CSS variables |
| Server state | TanStack Query v5 |
| Editor | `@monaco-editor/react` |
| Icons | `lucide-react` |
| API client | Native `fetch` wrapper |
| Unit tests | Vitest + React Testing Library |
| E2E | Playwright |

## Architecture Principles

- Feature modules own their screens, hooks, and feature-specific components.
- Shared UI components are domain-agnostic and reusable.
- API adapters normalize backend response shape before data reaches pages.
- TanStack Query owns remote state, caching, polling, and invalidation.
- Auth state is small: token, current user, hydration status, login/logout actions.
- No global Redux store for v1.
- Keep solve workspace state local or feature-scoped: selected language, code buffer, active result tab, poll state.

## Proposed Folder Structure

```text
frontend/
  docs/
    plans/
  public/
  src/
    app/
      App.tsx
      router.tsx
      providers.tsx
      queryClient.ts
    shared/
      api/
        client.ts
        errors.ts
        endpoints.ts
        queryKeys.ts
        types.ts
        normalizers.ts
      config/
        env.ts
      lib/
        cn.ts
        format.ts
        status.ts
        storage.ts
      ui/
        badge/
        button/
        chart/
        dialog/
        form/
        heatmap/
        input/
        layout/
        modal/
        pagination/
        table/
        tabs/
        toast/
    features/
      auth/
        api.ts
        hooks.ts
        AuthProvider.tsx
        LoginPage.tsx
        RegisterPage.tsx
        ProtectedRoute.tsx
        AdminRoute.tsx
      problems/
        api.ts
        hooks.ts
        ProblemListPage.tsx
        ProblemTable.tsx
        ProblemFilters.tsx
      solve/
        api.ts
        hooks.ts
        SolvePage.tsx
        CodeEditor.tsx
        ProblemStatement.tsx
        TestResultPanel.tsx
        SubmissionControls.tsx
      profile/
        api.ts
        hooks.ts
        ProfilePage.tsx
        StatsCards.tsx
        ActivityHeatmap.tsx
        SubmissionHistoryTable.tsx
      leaderboard/
        api.ts
        hooks.ts
        LeaderboardPage.tsx
        LeaderboardTable.tsx
      admin/
        api.ts
        hooks.ts
        AdminLayout.tsx
        AdminProblemsPage.tsx
        ProblemForm.tsx
        TestCaseEditor.tsx
        TemplateEditor.tsx
    pages/
      NotFoundPage.tsx
    styles/
      globals.css
    main.tsx
```

## Route Map

| Route | Access | Phase | Purpose |
| --- | --- | --- | --- |
| `/` | Public | 1 | Redirect to `/problems` or show problem list shell. |
| `/login` | Anonymous preferred | 2 | Login. |
| `/register` | Anonymous preferred | 2 | Register. |
| `/problems` | Public | 3 | Problem catalog with filters and pagination. |
| `/problems/:slug` | Public view, enhanced when logged in | 4 | Solve workspace. |
| `/profile` | User | 5 | Stats, activity, history. |
| `/leaderboard` | Public | 6 | All-time/weekly ranking. |
| `/admin` | Admin | 7 | Admin dashboard redirect. |
| `/admin/problems` | Admin | 7 | Problem management. |
| `*` | Public | 1 | Not found. |

## Layout Model

Global app shell:

- top nav with brand, problems, leaderboard, profile/admin links, auth actions,
- constrained page layouts for catalog/profile/admin,
- full-height workspace layout for solve page,
- toast region for API and submission feedback.

Solve page:

- desktop: three-pane workspace with problem statement, Monaco editor, and tests/results,
- tablet: two columns with results under editor,
- mobile: tabs for statement, code, and results.

## API Layer

The shared API layer should expose:

- `apiFetch<T>()` for requests,
- endpoint-specific functions in each feature,
- normalized frontend types,
- typed error objects,
- auth header injection,
- automatic JSON parsing,
- status-aware error handling,
- query key helpers.

Do not let raw backend response quirks leak into page components.

## State Model

| State | Owner |
| --- | --- |
| Current user/token | `features/auth/AuthProvider` |
| Server data | TanStack Query |
| Form state | Local component state, promoted only if reused |
| Filters/search/page | URL search params |
| Solve editor buffer | Solve feature state, persisted per problem/language in localStorage |
| Submission polling | TanStack Query with phase-specific polling rules |
| Toasts | Shared toast provider |

## Styling Direction

Design should feel like a coding tool, not a landing page:

- dense, readable tables,
- quiet navigation,
- strong code workspace,
- restrained borders and panels,
- difficulty colors: green, amber, red,
- status colors: neutral, blue, green, red, amber,
- avoid single-hue dominance,
- keep controls stable in size so text and icons do not shift layout.

Recommended token categories:

- background, surface, surface-muted,
- border, border-strong,
- text, text-muted, text-subtle,
- accent, accent-hover,
- success, warning, danger, info,
- difficulty-easy, difficulty-medium, difficulty-hard.

## Accessibility Baseline

- Buttons and icon buttons need accessible labels.
- Form inputs need labels and clear error text.
- Modals trap focus and close on Escape.
- Tables need semantic headers.
- Tabs and segmented controls need keyboard navigation.
- Monaco should not trap users away from global navigation unexpectedly.

## Environment Variables

```text
VITE_API_URL=http://localhost:8000/api/v1
```

Optional later:

```text
VITE_ENABLE_API_FIXTURES=false
VITE_APP_NAME=XYZ Platform
```
