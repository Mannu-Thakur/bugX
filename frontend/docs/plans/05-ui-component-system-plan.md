# UI Component System Plan

The frontend should feel like a compact coding platform. Build reusable components as real app tools, not decorative placeholders.

## Design Rules

- Prefer functional controls over explanatory copy.
- Use icons in icon buttons when a common icon exists.
- Use `lucide-react` for icons.
- Keep border radius at 8px or less.
- Avoid nested cards.
- Use panels and full-width sections for layout; reserve cards for repeated items, stat cards, modals, and self-contained tools.
- Keep text stable inside buttons, table cells, badges, and cards.
- Do not use viewport-width font scaling.
- Use clear focus states and keyboard-accessible controls.

## Base Components

| Component | Purpose | Key States |
| --- | --- | --- |
| `Button` | Primary, secondary, ghost, danger commands | default, hover, focus, loading, disabled |
| `IconButton` | Common icon-only actions | tooltip, aria-label, active, disabled |
| `Input` | Text fields and search | error, disabled, clearable |
| `Textarea` | Description, JSON, source-like text | monospace option, error, resize |
| `Select` | Difficulty, language, sort, tags | placeholder, error, disabled |
| `Checkbox` | Sample test flag, boolean settings | checked, indeterminate, disabled |
| `Switch` | Binary settings where toggle UX is natural | on, off, disabled |
| `Tabs` | Page and workspace tabs | active, keyboard navigation |
| `SegmentedControl` | Period, language, simple mode switches | active, disabled |
| `Modal` | Confirmations and focused forms | focus trap, Escape close |
| `Toast` | API and submission feedback | success, error, warning, info |
| `Tooltip` | Icon labels and compact hints | hover, focus |

## Data Display Components

| Component | Purpose |
| --- | --- |
| `DataTable` | Shared table foundation for problems, history, leaderboard, admin. |
| `Pagination` | Page navigation using backend `page`, `limit`, `pages`. |
| `StatusBadge` | Submission statuses. |
| `DifficultyBadge` | EASY, MEDIUM, HARD. |
| `ScoreBadge` | Score or pending score state. |
| `MetricCard` | Profile stats and admin summaries. |
| `EmptyState` | Empty data with one clear action when needed. |
| `Skeleton` | Stable loading placeholders. |
| `ErrorState` | Retryable API failures. |

## Analytics Components

| Component | Data Source | Notes |
| --- | --- | --- |
| `DifficultyBreakdown` | `/users/me/stats` | Shows easy/medium/hard solved counts. |
| `DonutChart` | Derived from stats | Lightweight SVG implementation is enough. |
| `MiniBarChart` | Stats or future aggregates | Keep generic. |
| `ActivityHeatmap` | Future aggregate or derived submissions | Do not imply full history unless data exists. |
| `ScoreTrend` | Future aggregate | Build only when backend data supports it. |

Heatmap rule:

- v1 backend does not expose a complete daily activity aggregate.
- The component can render a no-data state or derive limited activity from paginated submissions.
- A full GitHub-style heatmap needs a backend aggregate endpoint or a complete submission history query.

## Problem Catalog Components

| Component | Responsibility |
| --- | --- |
| `ProblemTable` | Problem rows, difficulty, acceptance, score, tags, solved state. |
| `ProblemFilters` | Search, difficulty, tag, sort, reset. |
| `TagFilter` | Uses `GET /tags`, exact case-sensitive tag names. |
| `AcceptanceCell` | Null acceptance renders as a quiet dash. |
| `ProblemStatusIcon` | Solved/attempted/none when user status is available. |

Problem table columns:

- status,
- title,
- difficulty,
- tags,
- acceptance,
- score.

Mobile behavior:

- keep title and difficulty visible,
- collapse tags and acceptance into secondary row or compact columns,
- keep row tap target stable.

## Solve Workspace Components

| Component | Responsibility |
| --- | --- |
| `SolveLayout` | Desktop panes and mobile tabs. |
| `ProblemStatement` | Markdown description, tags, limits, difficulty, solved state. |
| `CodeEditor` | Monaco wrapper with language, value, change handling. |
| `LanguageTabs` | Python and JavaScript toggle. |
| `SubmissionControls` | Run, Submit, reset to template, loading states. |
| `SampleTests` | Displays sample inputs/expected outputs. |
| `TestResultPanel` | Results, status, stdout/stderr for samples only. |
| `SubmissionSummary` | Runtime, memory, passed counts, score. |
| `BestSolutionPanel` | Shows best code when backend returns it. |

Solve page rules:

- Run and Submit buttons must stay stable while loading.
- Disable duplicate Run/Submit while the active request is creating a submission.
- Show polling state without blocking code editing.
- Do not show hidden input or expected output.
- Treat `SAMPLE_PASSED` separately from `ACCEPTED`.

## Profile Components

| Component | Responsibility |
| --- | --- |
| `StatsCards` | Total solved, score, current streak, best streak. |
| `DifficultyBreakdown` | Solved counts by difficulty. |
| `ActivityHeatmap` | Activity visualization with honest data availability. |
| `SubmissionHistoryTable` | Paginated submissions. |

Profile layout:

- stats first,
- breakdown and activity second,
- submission history below,
- no oversized hero.

## Leaderboard Components

| Component | Responsibility |
| --- | --- |
| `LeaderboardTable` | Rank, user, score, solved. |
| `RankCell` | Distinct top ranks without noisy decoration. |
| `PeriodToggle` | All-time vs week. |

## Admin Components

| Component | Responsibility |
| --- | --- |
| `AdminLayout` | Admin nav and route frame. |
| `AdminProblemTable` | Existing problems and actions. |
| `ProblemForm` | Title, slug, description, difficulty, limits, scoring. |
| `TagPicker` | Existing tags and new tag flow when supported. |
| `TemplateEditor` | Per-language starter code, function name, arg style. |
| `TestCaseEditor` | Sample/hidden tests, JSON validation, ordering. |
| `ValidationSummary` | Aggregated form errors. |
| `ConfirmModal` | Unpublish confirmation. |

Admin validation should mirror backend docs:

- slug pattern,
- title length,
- positive time/memory/score fields,
- at least one template,
- JavaScript cannot use `kwargs`,
- at least one sample test,
- at least three hidden tests,
- unique `order_index`,
- valid JSON `input` and `expected_output`,
- weight at least 1.

## Visual Tone

Use a practical coding-tool palette:

- neutral app background,
- white or near-white panels in light mode,
- dark text with muted secondary text,
- blue or teal accent for selected controls,
- green/amber/red for difficulties,
- status colors that map to outcome meaning.

Avoid:

- decorative orbs and bokeh backgrounds,
- marketing hero sections,
- oversized cards for operational views,
- one-color purple/blue gradients,
- text-heavy onboarding blocks inside the app.
