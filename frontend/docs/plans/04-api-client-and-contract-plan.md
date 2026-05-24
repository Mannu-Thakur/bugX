# API Client And Contract Plan

## Base Configuration

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
```

Rules:

- all API paths are relative to `API_BASE_URL`,
- protected requests inject `Authorization: Bearer <token>`,
- JSON requests set `Content-Type: application/json`,
- 204 responses return `null`,
- errors throw a typed `ApiError`.

## ApiError Shape

```ts
type ApiError = {
  status: number;
  code: string;
  message: string;
  detail: unknown;
};
```

Error normalization:

- if status is 429, force `code = "RATE_LIMIT"`,
- if `detail` is a string, use it as message,
- if `detail` is an array, produce a concise validation message and keep raw detail,
- if response is not JSON, use response status text.

## Core Frontend Types

```ts
type Role = "USER" | "ADMIN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Language = "python" | "javascript";

type SubmissionStatus =
  | "PENDING"
  | "RUNNING"
  | "ACCEPTED"
  | "SAMPLE_PASSED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT"
  | "RUNTIME_ERROR"
  | "COMPILE_ERROR"
  | "MEMORY_LIMIT";

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
```

## Normalized Domain Types

```ts
type User = {
  id: string;
  email: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

type UserStats = {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
};

type ProblemSummary = {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  acceptanceRate: number | null;
  scoreBase: number | null;
  tags: string[];
  userStatus?: ProblemUserStatus;
};

type ProblemUserStatus = {
  solved: boolean;
  bestScore: number | null;
};

type ProblemDetail = ProblemSummary & {
  description: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  runtimeBonusMax: number;
  expectedComplexity: string | null;
  templates: Partial<Record<Language, string>>;
  sampleTests: SampleTestCase[];
  userStatus: ProblemUserStatus;
};

type SampleTestCase = {
  id?: string;
  input: string;
  expectedOutput: string;
  orderIndex?: number;
};

type SubmissionDetail = {
  id: string;
  userId?: string;
  problemId: string;
  language: Language;
  status: SubmissionStatus;
  passedCount: number;
  totalCount: number;
  passedWeight: number;
  totalWeight: number;
  score: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  errorMessage: string | null;
  runSamplesOnly: boolean;
  createdAt: string;
  updatedAt?: string;
};

type SubmissionResult = {
  id: string;
  testCaseId: string;
  passed: boolean;
  runtimeMs: number;
  memoryKb: number;
  testCaseInput: string | null;
  expectedOutput: string | null;
  stdout: string | null;
  stderr: string | null;
};

type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  solved: number;
};
```

## Endpoint Functions

Auth:

- `register(body): Promise<AuthToken>`
- `login(body): Promise<AuthToken>`
- `getMe(): Promise<User>`
- `updateMe(body): Promise<User>`

Problems:

- `listProblems(params): Promise<Paginated<ProblemSummary>>`
- `listTags(): Promise<string[]>`
- `getProblem(slug): Promise<ProblemDetail>`
- `getBestSubmission(slug): Promise<SubmissionDetail | null>`

Submissions:

- `createSubmission(body): Promise<{ id: string; status: SubmissionStatus }>`
- `getSubmission(id): Promise<SubmissionDetail>`
- `getSubmissionResults(id): Promise<SubmissionResult[]>`

Profile:

- `getMyStats(): Promise<UserStats>`
- `getMySubmissions(params): Promise<Paginated<SubmissionDetail>>`

Leaderboard:

- `getLeaderboard(period, limit): Promise<LeaderboardEntry[]>`

Admin:

- current live: `createProblem(body)` -> `POST /problems`
- current live: `updateProblem(slug, body)` -> `PATCH /problems/{slug}`
- current live: `createTag(name)` -> `POST /problems/tags?name=...`
- documented target: `unpublishProblem(id)` -> `DELETE /admin/problems/{id}`
- documented target: `addTestCases(problemId, body)` -> `POST /admin/problems/{id}/test-cases`

## Query Keys

```ts
queryKeys = {
  me: ["me"],
  tags: ["tags"],
  problems: (params) => ["problems", params],
  problem: (slug) => ["problem", slug],
  bestSubmission: (slug) => ["problem", slug, "best-submission"],
  submission: (id) => ["submission", id],
  submissionResults: (id) => ["submission", id, "results"],
  myStats: ["me", "stats"],
  mySubmissions: (params) => ["me", "submissions", params],
  leaderboard: (period, limit) => ["leaderboard", period, limit],
};
```

Invalidation rules:

- after login/register: invalidate `me`,
- after logout: clear query cache,
- after profile update: invalidate `me`,
- after submit accepted and scored: invalidate problem detail, profile stats, submissions, leaderboard,
- after admin problem changes: invalidate problems, tags if relevant, problem detail.

## Polling Rules

Terminal statuses:

```ts
const IN_PROGRESS = new Set(["PENDING", "RUNNING"]);
const TERMINAL = new Set([
  "ACCEPTED",
  "SAMPLE_PASSED",
  "WRONG_ANSWER",
  "TIME_LIMIT",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "MEMORY_LIMIT",
]);
```

Run polling:

- create submission with `run_samples_only: true`,
- poll every 1000-2000 ms,
- stop when status is terminal,
- fetch results,
- never poll score after `SAMPLE_PASSED`.

Submit polling:

- create submission with `run_samples_only: false`,
- poll every 1000-2000 ms,
- stop normal polling when status is terminal,
- if terminal status is `ACCEPTED` and `score === 0`, continue score polling for about 60 seconds,
- stop score polling when `score > 0`,
- timeout state should say score is still unavailable and allow refresh.

## Normalizers Required

Tags:

- accept current `TagResponse[]` from `/problems/tags`,
- accept documented `{ items: string[] }` from `/tags`,
- normalize to sorted `string[]` for filters,
- preserve tag ids separately for current admin `tag_ids` workflows.

Problem detail:

- accept `templates` as array or object,
- accept `sample_tests` or `sample_test_cases`,
- normalize tag objects or strings to `string[]`,
- default `user_status` to `{ solved: false, bestScore: null }`.

Leaderboard:

- accept documented `{ period, entries }`,
- accept current all-time list with `total_score`, `total_solved`,
- accept current weekly list with `weekly_score`, `weekly_solved`,
- normalize to `LeaderboardEntry[]`.

Submission history:

- accept rows with or without problem slug/title,
- avoid linking to missing problem slug,
- display `problem_id` fallback only when no better label exists.

Errors:

- handle `EMAIL_TAKEN`, `USERNAME_TAKEN`, `VALIDATION_ERROR`, `RATE_LIMIT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`,
- degrade gracefully when backend returns a plain `detail` string.
