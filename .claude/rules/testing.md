# Testing & verification

There is no automated test runner wired up yet. Until one exists:

- **Type safety is the baseline gate:** run `npx tsc --noEmit` before considering
  a change done. It must pass clean.
- **Manual evals:** for any change to prompts, the pipeline, or a provider, run
  the golden questions in `EVALS.md` against the running app and check the answer
  against the listed key points and the four criteria (accuracy, level, grounding,
  continuity).
- **Pure logic** (e.g. `security/output-filter.ts`, `lib/agent/conversation.ts`,
  `i18n/locale.ts`) is the priority for unit tests when a runner is added —
  prefer Vitest, colocated as `*.test.ts`.

## When adding a test runner (planned Phase 3)

- Vitest, `npm test`.
- Start with `output-filter` (split-tag cases across chunks) and `input-guard`
  (limits, rate-limit window) — they are pure and high-value.
- Convert `EVALS.md` into `evals/golden.json` driven by `evals/offline.ts`.
