# UML Specification — XYZ Platform (v1)

Formal **class** and **state** diagrams for architecture review and implementation. Notation: [Mermaid](https://mermaid.js.org/) (renders on GitHub and most Markdown viewers).

**Related:** [../backend/01-database-models.md](../backend/01-database-models.md) · [../backend/08-controllers-services.md](../backend/08-controllers-services.md) · [../backend/05-phase-4-judge.md](../backend/05-phase-4-judge.md)

---

## 1. Domain model — class diagram

Persistent entities and cardinalities. Enums shown as `«enumeration»`.

```mermaid
classDiagram
    direction TB

    class User {
        <<entity>>
        +UUID id
        +string email
        +string username
        +string password_hash
        +Role role
        +string avatar_url
        +bool is_active
        +datetime created_at
        +datetime updated_at
    }

    class UserStats {
        <<entity>>
        +UUID user_id
        +int total_solved
        +int easy_solved
        +int medium_solved
        +int hard_solved
        +int total_score
        +int current_streak
        +int best_streak
        +date last_active_date
    }

    class Problem {
        <<entity>>
        +UUID id
        +string slug
        +string title
        +string description
        +Difficulty difficulty
        +int time_limit_ms
        +int memory_limit_kb
        +int score_base
        +int runtime_bonus_max
        +float acceptance_rate
        +bool is_published
        +datetime created_at
    }

    class ProblemTemplate {
        <<entity>>
        +UUID id
        +UUID problem_id
        +string language
        +string template_code
        +string function_name
        +ArgStyle arg_style
    }

    class TestCase {
        <<entity>>
        +UUID id
        +UUID problem_id
        +string input
        +string expected_output
        +bool is_sample
        +int order_index
        +int weight
    }

    class Tag {
        <<entity>>
        +UUID id
        +string name
    }

    class Submission {
        <<entity>>
        +UUID id
        +UUID user_id
        +UUID problem_id
        +string language
        +string source_code
        +SubmissionStatus status
        +int passed_count
        +int total_count
        +int passed_weight
        +int total_weight
        +int score
        +int runtime_ms
        +int memory_kb
        +bool run_samples_only
        +datetime created_at
        +datetime updated_at
    }

    class SubmissionResult {
        <<entity>>
        +UUID id
        +UUID submission_id
        +UUID test_case_id
        +bool passed
        +string stdout
        +string stderr
        +int runtime_ms
        +int memory_kb
    }

    class Role {
        <<enumeration>>
        USER
        ADMIN
    }

    class Difficulty {
        <<enumeration>>
        EASY
        MEDIUM
        HARD
    }

    class SubmissionStatus {
        <<enumeration>>
        PENDING
        RUNNING
        ACCEPTED
        SAMPLE_PASSED
        WRONG_ANSWER
        TIME_LIMIT
        RUNTIME_ERROR
        COMPILE_ERROR
        MEMORY_LIMIT
    }

    class ArgStyle {
        <<enumeration>>
        kwargs
        positional
        single
    }

    User "1" --> "1" UserStats : owns
    User "1" --> "*" Submission : submits
    Problem "1" --> "*" Submission : receives
    Problem "1" --> "*" TestCase : contains
    Problem "1" --> "*" ProblemTemplate : provides
    Problem "*" --> "*" Tag : tagged via problem_tags
    Submission "1" --> "*" SubmissionResult : produces
    TestCase "1" --> "*" SubmissionResult : evaluated by
    User --> Role
    Problem --> Difficulty
    Submission --> SubmissionStatus
    ProblemTemplate --> ArgStyle
```

**Qualifying submission (derived rule, not a column):**  
`status = ACCEPTED ∧ run_samples_only = false`

---

## 2. Application layer — class diagram

HTTP adapters, domain services, and persistence. Dependency direction: Router → Controller → Service → Repository.

```mermaid
classDiagram
    direction TB

    namespace HTTP {
        class AuthRouter
        class ProblemsRouter
        class SubmissionsRouter
        class AdminRouter
        class LeaderboardRouter
    }

    namespace Controllers {
        class AuthController {
            +register()
            +login()
        }
        class ProblemController {
            +list_problems()
            +get_problem()
            +get_best_submission()
        }
        class SubmissionController {
            +create_submission()
            +get_submission()
            +get_results()
        }
        class AdminProblemController {
            +create()
            +update()
            +unpublish()
            +add_test_cases()
        }
        class LeaderboardController {
            +get_leaderboard()
        }
    }

    namespace Services {
        class AuthService {
            +register()
            +login()
        }
        class ProblemService {
            +list_filtered()
            +get_by_slug()
            +get_best_submission()
        }
        class SubmissionService {
            +create()
            +enqueue()
        }
        class JudgeService {
            +run()
        }
        class ScoringService {
            +on_submission_complete()
            +calculate_score()
        }
        class CodeWrapperService {
            +wrap()
        }
        class OutputCompareService {
            +compare()
        }
        class Judge0Client {
            +execute()
        }
        class LeaderboardService {
            +get_all_time()
            +get_weekly()
        }
        class RateLimitService {
            +check_ip()
            +check_submit()
        }
    }

    namespace Repositories {
        class UserRepo
        class ProblemRepo
        class SubmissionRepo
        class SubmissionResultRepo
        class UserStatsRepo
        class TagRepo
    }

    namespace Worker {
        class SubmissionWorker {
            +process_submission()
            +reclaim_stale_running()
        }
    }

    AuthRouter --> AuthController
    ProblemsRouter --> ProblemController
    SubmissionsRouter --> SubmissionController
    AdminRouter --> AdminProblemController
    LeaderboardRouter --> LeaderboardController

    AuthController --> AuthService
    ProblemController --> ProblemService
    SubmissionController --> SubmissionService
    AdminProblemController --> ProblemService
    LeaderboardController --> LeaderboardService

    AuthService --> UserRepo
    AuthService --> UserStatsRepo
    ProblemService --> ProblemRepo
    ProblemService --> SubmissionRepo
    SubmissionService --> SubmissionRepo
    SubmissionService --> RateLimitService
    JudgeService --> SubmissionRepo
    JudgeService --> SubmissionResultRepo
    JudgeService --> Judge0Client
    JudgeService --> CodeWrapperService
    JudgeService --> OutputCompareService
    ScoringService --> SubmissionRepo
    ScoringService --> UserStatsRepo
    LeaderboardService --> UserStatsRepo

    SubmissionWorker --> SubmissionRepo
    SubmissionWorker --> JudgeService
    SubmissionWorker --> ScoringService : Phase 5+
```

---

## 3. Submission lifecycle — state diagram

Terminal states are shown with `[*]`. `SAMPLE_PASSED` applies only when `run_samples_only = true`.

```mermaid
stateDiagram-v2
    direction LR

    [*] --> PENDING : POST /submissions\n(202 Accepted)

    PENDING --> RUNNING : worker dequeues\nUPDATE WHERE status=PENDING
    PENDING --> PENDING : duplicate queue message\n(no-op)

    RUNNING --> PENDING : stale reclaim\n(updated_at > 10 min)
    RUNNING --> RUNNING : crash mid-judge\n(until reclaim)

    state judge_fork <<choice>>
    RUNNING --> judge_fork : judge_service.run()

    judge_fork --> SAMPLE_PASSED : all tests pass\n∧ run_samples_only
    judge_fork --> ACCEPTED : all tests pass\n∧ ¬run_samples_only
    judge_fork --> WRONG_ANSWER : comparison fail
    judge_fork --> COMPILE_ERROR : compile error
    judge_fork --> RUNTIME_ERROR : runtime / judge down
    judge_fork --> TIME_LIMIT : TLE
    judge_fork --> MEMORY_LIMIT : MLE

    SAMPLE_PASSED --> [*]
    ACCEPTED --> [*]
    WRONG_ANSWER --> [*]
    COMPILE_ERROR --> [*]
    RUNTIME_ERROR --> [*]
    TIME_LIMIT --> [*]
    MEMORY_LIMIT --> [*]

    note right of ACCEPTED
        Phase 5: scoring_service
        may set score > 0
        after terminal ACCEPTED
    end note

    note right of SAMPLE_PASSED
        Never qualifying.
        Does not update stats.
    end note
```

---

## 4. Scoring sub-state (qualifying submissions only)

After judge sets `ACCEPTED` and `run_samples_only = false`, scoring runs in the worker (Phase 5).

```mermaid
stateDiagram-v2
    direction LR

    [*] --> JudgeComplete : status=ACCEPTED\nrun_samples_only=false

    JudgeComplete --> ScoringPending : score=0\n(worker starts)
    ScoringPending --> Scored : on_submission_complete OK\nscore ≥ score_base
    ScoringPending --> ScoringFailed : exception in scoring\nscore stays 0

    ScoringFailed --> Scored : scripts/rescore_submission.py\n(manual recovery)
    Scored --> [*]

    note right of ScoringPending
        UI: user_status.solved may be true
        while best_score is null
    end note
```

---

## 5. Worker job processing — state diagram

One submission row per job. v1: single worker replica.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> Idle : worker start

    Idle --> Reclaiming : startup hook
    Reclaiming --> Idle : RUNNING→PENDING\n+ re-LPUSH queue

    Idle --> WaitingQueue : BRPOP timeout
    WaitingQueue --> Idle : timeout (no job)
    WaitingQueue --> Processing : JSON payload received

    Processing --> Skipped : status ≠ PENDING
    Skipped --> Idle

    Processing --> Judging : set RUNNING\n delete old results
    Judging --> Scoring : judge OK\n∧ full submit
    Judging --> Idle : judge OK\n∧ run_samples_only
    Judging --> Idle : judge error → RUNTIME_ERROR

    Scoring --> Idle : scoring OK or caught error
    Scoring --> Idle : scoring exception\n(ACCEPTED preserved)

    note right of Judging
        judge_service.run:
        1. delete submission_results
        2. run all tests (no early exit)
        3. set terminal status
    end note
```

---

## 6. Client poll flow — state diagram (frontend)

Solve page behavior per [../backend/11-phase-6-frontend.md](../backend/11-phase-6-frontend.md).

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Idle

    Idle --> Submitting : Run or Submit clicked
    Submitting --> Polling : 202 + submission id

    Polling --> Polling : status ∈ {PENDING, RUNNING}
    Polling --> RunSuccess : SAMPLE_PASSED
    Polling --> SubmitTerminal : terminal ≠ ACCEPTED
    Polling --> ScorePolling : status=ACCEPTED

    ScorePolling --> ScorePolling : score=0\n(elapsed < 60s)
    ScorePolling --> SubmitSuccess : score > 0
    ScorePolling --> ScoreTimeout : timeout\nshow refresh hint

    RunSuccess --> Idle
    SubmitTerminal --> Idle
    SubmitSuccess --> Idle
    ScoreTimeout --> Idle
```

---

## 7. Authentication — state diagram

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Anonymous

    Anonymous --> Authenticated : login/register OK\n(JWT issued)
    Anonymous --> Anonymous : invalid credentials (401)

    Authenticated --> Anonymous : logout / token cleared
    Authenticated --> Blocked : is_active=false\n(403 on protected routes)

    Blocked --> Anonymous : logout

    state Authenticated {
        [*] --> TokenValid
        TokenValid --> TokenValid : API calls with Bearer
        TokenValid --> [*] : token expired (401)
    }

    note right of Authenticated
        Optional auth on GET /problems/{slug}:
        no header → Anonymous view
        invalid Bearer → 401 (not silent anon)
    end note
```

---

## 8. Entity-relationship diagram

Logical schema (PostgreSQL). `problem_tags` is associative.

```mermaid
erDiagram
    USERS ||--o| USER_STATS : has
    USERS ||--o{ SUBMISSIONS : submits
    PROBLEMS ||--o{ SUBMISSIONS : receives
    PROBLEMS ||--o{ TEST_CASES : contains
    PROBLEMS ||--o{ PROBLEM_TEMPLATES : has
    PROBLEMS ||--o{ PROBLEM_TAGS : links
    TAGS ||--o{ PROBLEM_TAGS : links
    SUBMISSIONS ||--o{ SUBMISSION_RESULTS : yields
    TEST_CASES ||--o{ SUBMISSION_RESULTS : for

    USERS {
        uuid id PK
        string email UK
        string username UK
        enum role
        bool is_active
    }

    USER_STATS {
        uuid user_id PK_FK
        int total_solved
        int total_score
    }

    PROBLEMS {
        uuid id PK
        string slug UK
        enum difficulty
        bool is_published
        float acceptance_rate
    }

    SUBMISSIONS {
        uuid id PK
        uuid user_id FK
        uuid problem_id FK
        enum status
        int score
        bool run_samples_only
    }

    SUBMISSION_RESULTS {
        uuid id PK
        uuid submission_id FK
        uuid test_case_id FK
    }
```

---

## Diagram index

| § | Diagram | Type | Primary audience |
|---|---------|------|------------------|
| 1 | Domain model | Class | DB / backend devs |
| 2 | Application layer | Class | Backend devs |
| 3 | Submission lifecycle | State | Backend + frontend |
| 4 | Scoring sub-state | State | Backend + ops |
| 5 | Worker job processing | State | Backend / DevOps |
| 6 | Client poll flow | State | Frontend |
| 7 | Authentication | State | Full stack |
| 8 | Entity-relationship | ER | DB / migrations |

---

## Maintenance

When schema or worker behavior changes, update this file **and** the relevant phase doc, then add a row to [../backend/13-plan-verification.md](../backend/13-plan-verification.md).
