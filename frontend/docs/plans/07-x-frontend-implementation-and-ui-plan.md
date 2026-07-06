# X Frontend Implementation and UI Placement Plan

This document defines the full frontend plan for X, the native AI layer of bugX.

It is based on:

- the X master implementation requirement,
- the existing React/Vite frontend,
- the existing FastAPI backend shape,
- the backend X phase-wise implementation plan in `docs/backend/14-x-backend-phase-wise-implementation.md`.

No frontend implementation should begin until the relevant backend/API phase is approved or mocked.

## Current Frontend Shape

Existing stack:

- React 19
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- Monaco editor
- `lucide-react`
- shared API client in `src/shared/lib/api.ts`
- app shell in `src/shared/ui/layout/PageShell.tsx`
- auth provider in `src/features/auth/AuthProvider.tsx`

Current route structure:

- `/`
- `/problems`
- `/problems/:slug`
- `/problems/:slug/submissions/:id`
- `/leaderboard`
- `/profile`
- `/settings`
- `/appearance`
- `/battle`
- `/battle/arena`
- `/battle/:battleId`
- `/admin/*`

X must feel like part of this product, not a separate chatbot.

## Product Placement Summary

X should appear in these places:

| Surface | Placement | Primary Action |
| --- | --- | --- |
| Navbar | Between Contest and Leaderboard | Open X home/workspace |
| Global app | Floating button bottom-right | Open contextual X panel |
| Problem page | Description toolbar and side panel | Ask X about problem |
| Editor | Beside Run and Submit | Ask X about current code |
| Submission result | Status/action area | Why did this fail? |
| Battle/Contest | Battle header/editor area | Hints-only mentor |
| Profile | Insights section | X Insights |
| Vault | File row/actions | Summarize / flashcards |
| Admin | Optional future helper | Draft validation / problem quality |

## Design Direction

X should be sleek, compact, and work-focused.

Use the current bugX visual language:

- dark operational interface,
- compact typography,
- Monaco-like editor mood,
- restrained borders,
- subtle blue/amber/emerald status colors,
- no marketing hero,
- no decorative blobs,
- no nested cards,
- no large explanatory text blocks inside the app.

Design principles:

- X should be visible but not noisy.
- The primary UI should be a productive side panel/chat tool.
- Use icon buttons with tooltips for common actions.
- Use tabs or segmented controls for X modes.
- Use badges for context and safety state.
- Use streaming message rendering by default.
- Keep all controls stable during loading.
- Never block code editing while X is responding.

## Frontend Phase Dependency Graph

1. Phase 0 - Frontend analysis and contract alignment
2. Phase 1 - X API client and types
3. Phase 2 - X shared state and streaming foundation
4. Phase 3 - X base components
5. Phase 4 - X page route
6. Phase 5 - Global X panel and floating launcher
7. Phase 6 - Problem page integration
8. Phase 7 - Editor integration
9. Phase 8 - Submission analysis integration
10. Phase 9 - Battle/contest integration
11. Phase 10 - Profile insights integration
12. Phase 11 - Vault integration
13. Phase 12 - History, favorites, feedback, export
14. Phase 13 - Polish, accessibility, QA

Each phase should compile and be independently testable.

## Proposed Frontend Directory Structure

```text
frontend/src/
  features/
    x/
      XPage.tsx
      types.ts
      api.ts
      stream.ts
      queryKeys.ts
      hooks/
        useXPanel.ts
        useXStream.ts
        useXContext.ts
        useXHistory.ts
        useXFeedback.ts
      components/
        XButton.tsx
        XFloatingButton.tsx
        XPanel.tsx
        XPanelHeader.tsx
        XChat.tsx
        XMessage.tsx
        XStreamingMessage.tsx
        XPromptInput.tsx
        XModeTabs.tsx
        XSuggestions.tsx
        XContextBadge.tsx
        XContextPreview.tsx
        XLoading.tsx
        XErrorState.tsx
        XEmptyState.tsx
        XHistoryList.tsx
        XFeedbackControls.tsx
        XSafetyBadge.tsx
        XUsageMeter.tsx
      integrations/
        ProblemXActions.tsx
        EditorXActions.tsx
        SubmissionXAnalysis.tsx
        BattleXMentor.tsx
        ProfileXInsights.tsx
        VaultXActions.tsx
```

## Phase 0 - Frontend Analysis and Contract Alignment

### Goals

- Confirm current frontend architecture.
- Confirm all X placement surfaces.
- Confirm backend endpoint availability or mock strategy.
- Avoid UI work that depends on unimplemented backend behavior unless mocked.

### Files Created

- `frontend/docs/plans/07-x-frontend-implementation-and-ui-plan.md`

### Files Modified

- None.

### Backend Dependencies

- Backend X plan only.
- No live X APIs required.

### API Changes

- None.

### UI Changes

- None.

### Risks

- Designing components before backend stream shape is final.
- Overloading current problem/editor pages.

### Verification

- Review `src/shared/lib/api.ts`.
- Review `src/app/router.tsx`.
- Review `src/shared/ui/layout/PageShell.tsx`.
- Review problem, editor, submission, battle, profile, vault pages.

## Phase 1 - X API Client and Types

### Goals

- Add strongly typed X API functions.
- Keep JSON APIs inside normal `api.ts` pattern.
- Add separate streaming helper because current request wrapper assumes JSON.

### Files Created

- `src/features/x/types.ts`
- `src/features/x/api.ts`
- `src/features/x/stream.ts`
- `src/features/x/queryKeys.ts`

### Files Modified

- `src/shared/lib/api.ts`, only if shared token/error helpers need export.

### Backend Dependencies

- `GET /api/v1/x/modes`
- `POST /api/v1/x/action`
- `POST /api/v1/x/context/preview`
- `POST /api/v1/x/stream`

### UI Changes

- None.

### Core Types

- `XMode`
- `XScope`
- `XSafetyMode`
- `XContextRequest`
- `XActionRequest`
- `XActionResponse`
- `XStreamEvent`
- `XSession`
- `XMessage`
- `XFeedback`

### Risks

- Streaming event names may change.
- Duplicating token logic.

### Verification

- Typecheck passes.
- Mock API functions can be consumed by future components.
- Streaming helper supports auth headers and abort signal.

## Phase 2 - X Shared State and Streaming Foundation

### Goals

- Create shared state for panel open/closed, active mode, current context, streamed messages, and cancellation.
- Keep state local to X feature. Do not introduce a new global state system.
- Use React state, hooks, and TanStack Query where appropriate.

### Files Created

- `src/features/x/hooks/useXPanel.ts`
- `src/features/x/hooks/useXStream.ts`
- `src/features/x/hooks/useXContext.ts`
- `src/features/x/hooks/useXHistory.ts`
- `src/features/x/hooks/useXFeedback.ts`

### Files Modified

- None initially.

### Backend Dependencies

- Phase 1 client methods.
- Mock provider acceptable for initial UI development.

### UI Changes

- None yet.

### State Responsibilities

- `useXPanel`
  - open/close panel,
  - active scope,
  - active mode,
  - source surface.

- `useXStream`
  - start stream,
  - append chunks,
  - cancel stream,
  - expose loading/error/done state.

- `useXContext`
  - assemble frontend-only context,
  - request backend context preview,
  - expose context badges.

### Risks

- Panel state becomes disconnected from route/page context.
- Abort handling fails on route change.

### Verification

- Unit-style hook smoke tests if test setup exists.
- Manual dev check with mocked stream.
- Route change closes or safely resets active stream.

## Phase 3 - X Base Components

### Goals

- Build reusable X UI building blocks.
- Keep components compact and domain-specific.
- Support streaming-first UX.

### Files Created

- `src/features/x/components/XButton.tsx`
- `src/features/x/components/XFloatingButton.tsx`
- `src/features/x/components/XPanel.tsx`
- `src/features/x/components/XPanelHeader.tsx`
- `src/features/x/components/XChat.tsx`
- `src/features/x/components/XMessage.tsx`
- `src/features/x/components/XStreamingMessage.tsx`
- `src/features/x/components/XPromptInput.tsx`
- `src/features/x/components/XModeTabs.tsx`
- `src/features/x/components/XSuggestions.tsx`
- `src/features/x/components/XContextBadge.tsx`
- `src/features/x/components/XContextPreview.tsx`
- `src/features/x/components/XLoading.tsx`
- `src/features/x/components/XErrorState.tsx`
- `src/features/x/components/XEmptyState.tsx`
- `src/features/x/components/XFeedbackControls.tsx`
- `src/features/x/components/XSafetyBadge.tsx`
- `src/features/x/components/XUsageMeter.tsx`

### Files Modified

- None until placement phases.

### Backend Dependencies

- `GET /api/v1/x/modes`, or mocked modes.

### UI Design

#### XButton

Use cases:

- navbar item,
- problem toolbar,
- editor toolbar,
- submission action,
- profile/vault action.

Variants:

- `nav`
- `toolbar`
- `compact`
- `floating`

#### XPanel

Desktop placement:

- right side drawer,
- width `420px` to `480px`,
- fixed to viewport,
- does not cover main code editor when avoidable.

Mobile placement:

- full-screen sheet,
- header with close/back,
- prompt input fixed at bottom.

#### XChat

Message layout:

- compact vertical transcript,
- user messages right-aligned,
- assistant messages left-aligned,
- mode/context badges above assistant response,
- streaming indicator inline.

#### XPromptInput

Controls:

- textarea,
- send icon,
- stop icon while streaming,
- context preview icon,
- mode selector if panel width allows.

#### XModeTabs

Use segmented control style:

- Explain
- Hint
- Debug
- Optimize
- Complexity
- Edge Cases
- Tests
- Refactor

### Risks

- Panel becomes too visually heavy.
- Too many modes shown at once on small screens.

### Verification

- Components render with mock data.
- Text does not overflow at mobile widths.
- Keyboard focus order is usable.
- Buttons have labels/tooltips.

## Phase 4 - X Page Route

### Goals

- Add a dedicated X page for full history and general AI workspace.
- Keep it functional, not a marketing page.
- Make it available from navbar.

### Files Created

- `src/features/x/XPage.tsx`

### Files Modified

- `src/app/router.tsx`
- `src/shared/ui/layout/PageShell.tsx`

### Backend Dependencies

- `GET /api/v1/x/modes`
- `GET /api/v1/x/sessions`
- `GET /api/v1/x/sessions/{session_id}`
- `POST /api/v1/x/action`
- `POST /api/v1/x/stream`

### UI Placement

Navbar:

- Add `X` between `Contest` and `Leaderboard`.
- Use a compact icon + label.
- Highlight active route `/x`.

Page layout:

- Left column: session/history list.
- Center column: chat workspace.
- Right slim column: context/mode metadata, hidden on smaller screens.

Desktop:

```text
| History 260px | Chat flexible | Context 280px |
```

Tablet/mobile:

```text
| Chat full width |
History and context open as drawers.
```

### Risks

- Route feels disconnected from contextual X.
- History APIs may not exist yet.

### Verification

- `/x` route loads behind auth if X requires login.
- Empty state works when no history exists.
- Chat works with mock provider.

## Phase 5 - Global X Panel and Floating Launcher

### Goals

- Make X accessible everywhere.
- Preserve current page context.
- Avoid covering critical controls.

### Files Created

- `src/features/x/components/XFloatingButton.tsx`
- `src/features/x/integrations/GlobalXProvider.tsx`, if needed.

### Files Modified

- `src/app/providers.tsx`
- `src/shared/ui/layout/PageShell.tsx`

### Backend Dependencies

- `POST /api/v1/x/context/preview`
- `POST /api/v1/x/stream`

### UI Placement

Desktop:

- Floating button bottom-right.
- Offset above footer and toast area.
- Hidden or reduced in battle full-screen if battle-specific mentor is shown.

Mobile:

- Floating button bottom-right.
- Opens full-screen panel.
- Must not overlap mobile nav/menu controls.

Panel source scope:

- Problem page: `problem`
- Submission page: `submission`
- Battle room: `battle`
- Profile: `profile`
- Vault: `vault`
- Other: `global`

### Risks

- Floating button competes with existing timer/settings.
- Panel accidentally captures stale context.

### Verification

- Open/close panel on all major routes.
- Route change updates scope.
- Streaming cancels cleanly on close.

## Phase 6 - Problem Page Integration

### Goals

- Add X to problem statement workflow.
- Help users understand the current problem without pasting context.

### Files Created

- `src/features/x/integrations/ProblemXActions.tsx`

### Files Modified

- `src/features/problems/ProblemDetailPage.tsx`
- `src/features/problems/components/ProblemDescription.tsx`

### Backend Dependencies

- `POST /api/v1/x/action`
- `POST /api/v1/x/stream`
- `POST /api/v1/x/context/preview`

### UI Placement

Problem description header:

- Add compact `Ask X` button near title/tabs.
- In desktop split view, place in the description pane tab bar.
- In focus mode, place in the top problem header action row.
- On mobile, place inside description tab header.

Suggested quick actions:

- Explain Problem
- Give Hint
- Complexity
- Edge Cases
- Compare Approaches
- Pattern
- Generate Tests

Context sent:

- problem id,
- slug,
- title,
- description,
- difficulty,
- tags,
- constraints if available,
- sample tests,
- current frontend notes if user allows,
- current page path.

### Risks

- Problem description may contain HTML or imported content with prompt injection.
- Generated tests may be mistaken for official tests.

### Verification

- X opens with problem context badge.
- Context preview excludes hidden tests.
- Quick actions stream response.
- Mobile layout remains stable.

## Phase 7 - Editor Integration

### Goals

- Add X beside Run and Submit.
- Use current code and selected language automatically.
- Provide debugging, optimization, refactoring, and edge-case help.

### Files Created

- `src/features/x/integrations/EditorXActions.tsx`

### Files Modified

- `src/features/problems/ProblemDetailPage.tsx`
- `src/features/problems/components/CodeEditor.tsx`
- `src/features/battle/components/BattleEditor.tsx`

### Backend Dependencies

- `POST /api/v1/x/stream`
- `POST /api/v1/x/action`

### UI Placement

Problem editor toolbar:

```text
Hint | Run | Submit | Ask X
```

The `Ask X` control should be icon-first and compact.

Editor mode menu:

- Debug
- Optimize
- Complexity
- Refactor
- Edge Cases
- Generate Tests

Context sent:

- problem id,
- slug,
- selected language,
- current code,
- selected text if Monaco selection is available,
- active submission status if present,
- run/sample results if present.

### Monaco Integration

Optional later:

- context menu action: `Ask X about selection`,
- keyboard shortcut: `Ctrl/Cmd + I`,
- inline code selection explanation.

### Risks

- Current `CodeEditor` does not expose selection state.
- Sending code on every panel open may be expensive.
- Refactor output may become too solution-like during contest.

### Verification

- Ask X sees latest unsaved code.
- Language changes are reflected.
- Panel does not steal editor focus unless opened.
- Read-only finished battle editor does not allow unsafe refactor apply.

## Phase 8 - Submission Analysis Integration

### Goals

- Replace current "AI Insights coming soon" area with real X analysis.
- Provide clear failure explanations and accepted-solution review.

### Files Created

- `src/features/x/integrations/SubmissionXAnalysis.tsx`

### Files Modified

- `src/features/problems/SubmissionResultPage.tsx`

### Backend Dependencies

- `POST /api/v1/x/submissions/{submission_id}/analyze`
- `POST /api/v1/x/stream`

### UI Placement

Submission result page:

- In status hero action area: `Why did this fail?` for failed submissions.
- In AI Insights section: replace locked placeholders with X cards.
- For accepted submissions: show `Review solution`.

Suggested analysis cards:

- Cause
- Fix Direction
- Complexity
- Likely Edge Cases
- Optimization
- What to Revise

Context sent:

- submission id,
- problem metadata,
- language,
- source code,
- status,
- error message,
- sample results,
- first failing hidden result only if backend revealed it.

### Risks

- Users may expect hidden test details.
- Current result page has multiple status branches.

### Verification

- Failed submission shows correct CTA.
- Accepted submission shows review CTA.
- Analysis does not invent hidden inputs.
- Streaming can be stopped.

## Phase 9 - Battle and Contest Integration

### Goals

- Add X contest mentor to battle rooms.
- During active battle, enforce hints-only behavior.
- After battle, provide complete review.

### Files Created

- `src/features/x/integrations/BattleXMentor.tsx`

### Files Modified

- `src/features/battle/pages/BattleRoomPage.tsx`
- `src/features/battle/pages/BattleArenaPage.tsx`
- `src/features/battle/components/BattleHeader.tsx`
- `src/features/battle/components/BattleResultModal.tsx`
- `src/features/battle/components/BattleEditor.tsx`

### Backend Dependencies

- `POST /api/v1/x/battle/{battle_id}/mentor`
- `POST /api/v1/x/battle/{battle_id}/review`

### UI Placement

Active battle header:

```text
Timer | Problem toggle | Scoreboard toggle | Ask X
```

Battle editor:

- Add compact `Ask X` near Run/Submit.
- Label safety state as `Contest Mode: hints only`.

Battle result modal:

- Add `X Contest Review` button below leaderboard summary.

Allowed active modes:

- Hint
- Pattern
- Constraint Explanation
- Complexity Guidance

Blocked active modes:

- Full Solution
- Refactor to final code
- Complete answer generation

### Risks

- Battle UI is full-screen and dense.
- WebSocket state and REST state can diverge.
- Safety rule must be visible to user.

### Verification

- Active battle shows safety badge.
- Full-solution modes are hidden or disabled.
- Finished battle enables review.
- Local battle mode has frontend-only context if no backend battle id exists.

## Phase 10 - Profile Insights Integration

### Goals

- Add X Insights to profile.
- Analyze user progress, consistency, weak topics, and recommendations.

### Files Created

- `src/features/x/integrations/ProfileXInsights.tsx`

### Files Modified

- `src/features/profile/ProfilePage.tsx`

### Backend Dependencies

- `POST /api/v1/x/profile/insights`
- `POST /api/v1/x/profile/recommendations`

### UI Placement

Profile page:

- Add section after accomplishments and battle performance.
- Before activity heatmap or before recent submissions.

Section layout:

```text
X Insights
| Strengths | Weak Topics | Next Steps |
```

CTA:

- `Generate Insights`
- `Refresh`
- `Add to Revision Plan`, future.

### Risks

- Empty profiles need useful zero state.
- Weak topics require enough submission/tag data.

### Verification

- New user zero state is helpful.
- Existing user gets streamed insights.
- Recommendations link only to visible problems.

## Phase 11 - Vault Integration

### Goals

- Let X work with uploaded vault files.
- Summarize notes.
- Generate flashcards and revision sheets.

### Files Created

- `src/features/x/integrations/VaultXActions.tsx`

### Files Modified

- `src/features/settings/SettingsPage.tsx`

### Backend Dependencies

- `POST /api/v1/x/vault/files/{file_id}/summarize`
- `POST /api/v1/x/vault/files/{file_id}/flashcards`
- `POST /api/v1/x/vault/files/{file_id}/revision-sheet`

### UI Placement

Vault file table actions:

```text
Download | Ask X | Delete
```

Ask X menu:

- Summarize
- Flashcards
- Revision Sheet
- Explain

Vault tab header:

- Optional `Ask X about this subject` button for selected subject.

### Risks

- Some files may not be parseable.
- Large files need clear error states.

### Verification

- File action uses correct file id.
- Unsupported file type shows clear message.
- X panel opens with `vault` context badge.

## Phase 12 - History, Favorites, Feedback, Export

### Goals

- Make X feel persistent and useful over time.
- Add feedback controls to responses.
- Add session list and search.
- Add export.

### Files Created

- `src/features/x/components/XHistoryList.tsx`
- `src/features/x/components/XFeedbackControls.tsx`

### Files Modified

- `src/features/x/XPage.tsx`
- `src/features/x/components/XChat.tsx`
- `src/features/x/api.ts`

### Backend Dependencies

- `GET /api/v1/x/sessions`
- `GET /api/v1/x/sessions/{session_id}`
- `PATCH /api/v1/x/sessions/{session_id}`
- `DELETE /api/v1/x/sessions/{session_id}`
- `GET /api/v1/x/sessions/search`
- `POST /api/v1/x/messages/{message_id}/feedback`
- `GET /api/v1/x/sessions/{session_id}/export`

### UI Placement

X page:

- left history list,
- search input,
- pinned/favorite filter,
- export action in session menu.

X panel:

- show recent sessions in a compact drawer or command menu.

Message actions:

- copy,
- thumbs up/down,
- regenerate,
- continue,
- favorite.

### Risks

- Too much history UI in compact panel.
- Export can be confusing if current response is still streaming.

### Verification

- History pagination works.
- Feedback persists.
- Delete requires confirmation.
- Export downloads correct session.

## Phase 13 - Polish, Accessibility, QA

### Goals

- Finish responsive behavior.
- Verify no overlapping UI.
- Verify keyboard and screen reader basics.
- Verify streaming, cancellation, and route changes.

### Files Modified

- All X integration files as needed.

### Backend Dependencies

- Full X backend or stable mock server.

### QA Checklist

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Test desktop width.
- Test mobile width.
- Test problem page.
- Test editor panel.
- Test submission analysis.
- Test battle active and finished states.
- Test profile insights.
- Test vault file actions.
- Test auth expiry during X request.
- Test backend offline state.
- Test stream timeout.
- Test cancellation.

## UX Details by Surface

### Navbar

Current nav:

```text
bugX | Problems | Contest | Leaderboard | Profile | Vault
```

Target nav:

```text
bugX | Problems | Contest | X | Leaderboard | Profile | Vault
```

Behavior:

- `X` routes to `/x`.
- Active state matches other nav links.
- Mobile drawer includes X.

### Global Floating Button

Placement:

- bottom-right,
- above toast zone,
- hidden when X panel is open,
- compact icon-only on mobile.

Behavior:

- opens contextual X panel,
- auto-detects current route scope,
- shows current context badge in panel header.

### X Panel

Header:

- title: `X`
- context badge,
- safety badge,
- new session icon,
- history icon,
- close icon.

Body:

- mode tabs,
- suggestions,
- chat transcript,
- streaming messages.

Footer:

- prompt input,
- send/stop,
- context preview icon.

### Problem Page

Placements:

- description tab bar,
- focus mode header,
- mobile description tab.

Primary actions:

- Explain
- Hint
- Complexity
- Edge Cases
- Tests

### Editor

Placements:

- next to Run/Submit in main solve page,
- inside focus mode status bar,
- inside battle editor controls.

Primary actions:

- Debug
- Optimize
- Refactor
- Complexity
- Edge Cases

### Submission Result

Placements:

- status hero CTA,
- AI insights section.

Primary actions:

- Why did this fail?
- Fix direction
- Optimize
- Review accepted solution

### Battle

Placements:

- battle header,
- editor action row,
- result modal.

Active state:

- show `Contest Mode: hints only`.

Finished state:

- show `X Contest Review`.

### Profile

Placement:

- after profile accomplishments and battle performance.

Cards:

- Strengths
- Weak Topics
- Next Problems
- Revision Plan

### Vault

Placement:

- file action row,
- subject workspace header.

Actions:

- Summarize
- Flashcards
- Revision Sheet

## Context Rules

Frontend sends volatile context only:

- current route,
- current editor code,
- selected language,
- selected text,
- unsaved notes,
- local battle state for local-only battles,
- UI source surface.

Backend owns and validates durable context:

- problem visibility,
- submission ownership,
- battle participation,
- user profile/stats,
- vault file ownership,
- history/session ownership.

Never send:

- tokens,
- full localStorage,
- unrelated user data,
- another player's private code unless backend policy allows battle shared context.

## Streaming UI Rules

When streaming starts:

- disable send,
- show stop,
- append assistant placeholder,
- render chunks as they arrive.

When streaming ends:

- show copy,
- show feedback,
- show regenerate,
- persist session if backend returns ids.

When streaming fails:

- preserve partial text,
- show retry,
- show clear error message.

When route changes:

- abort active stream or ask user only if needed.

## Safety UX Rules

Practice mode:

- allow full explanations,
- allow debugging,
- allow refactoring,
- allow optimization.

Active contest/battle mode:

- show visible safety badge,
- only show hint/pattern/complexity modes,
- hide or disable full solution/refactor modes,
- never label a response as final solution.

Post-contest mode:

- enable full review,
- enable mistake analysis,
- enable revision plan.

## Final Acceptance Criteria

The X frontend is complete when:

- navbar has X route,
- global X panel works,
- problem page has contextual X actions,
- editor has current-code X actions,
- submission result has real X analysis,
- battle active mode is hints-only,
- battle finished mode has contest review,
- profile has X insights,
- vault has file-level X actions,
- history and feedback work,
- streaming works with stop/retry,
- UI is responsive,
- build/typecheck/lint pass,
- no hidden test data is displayed,
- no unrelated user data is sent as context.

