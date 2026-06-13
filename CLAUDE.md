# LearnPhilosophy — guidance for AI agents

An AI philosophy tutor built on SolidJS + SolidStart (Vinxi, SSR), Tailwind, and a
canvas knowledge graph. The goal is to teach philosophy to people who know
nothing about philosophy *or* AI — favor clarity and friendliness over jargon.

## How to run

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` / `npm run start` — production
- Needs at least one LLM provider key in `.env` (see `.env.example`).

## Architecture

The chat API (`src/routes/api/ask.ts`) is a **thin handler**. Real logic lives in
composable layers — keep it that way:

- `src/lib/agent/pipeline.ts` — orchestration. Add new steps here, not in the route.
- `src/lib/llm/*` — one file per provider; `provider.ts` does selection + fallback.
- `src/lib/prompts/*` — all prompts live here, not inline in provider code.
- `src/lib/security/*` — `input-guard` (validation, rate limit) and `output-filter`
  (strips `<think>` reasoning). Any model/output safety belongs here.
- `src/lib/ontology.ts` — the typed knowledge graph; it is the grounding layer.
- `src/i18n/locale.ts` — supported locales: es, en, pt, it, fr.

## Conventions

- TypeScript, SolidJS primitives (`createSignal`, `createMemo`, `Show`, `For`).
- The tutor must answer in the user's `locale`, regardless of source-content
  language (hybrid i18n: source content stays in its original language).
- **Never display fabricated metrics.** Resource counts are derived from real
  listed resources; do not reintroduce invented `learnerCount` figures in the UI.
- Topic content is markdown in `src/content/topics/`; see `_template.md`.

## Compiled knowledge base

Sources live in `raw/`; the `knowledge-compiler` agent (`.claude/agents/`) compiles
them into topics in `src/content/topics/` (which feed the ontology + graph + tutor
RAG). `npm run knowledge` regenerates the master index `src/content/topics/_index.md`
(skipped by the content loader) and writes `outputs/health-check-*.md` flagging
broken `relatedTopics`, orphans, and missing frontmatter. Run it after topic
changes and fix what it flags. See `docs/knowledge-base.md`.

## Roadmap context

The project follows a 9-layer production-AI plan. Done: Phase 0 (modular pipeline,
output filter, input guard, locale-aware answers, honest metrics), Phase 1 (full
i18n es/en/pt/it/fr), Phase 2 (Socratic tutoring + difficulty levels + learner
memory + global chatbar), Phase 3 (lexical retrieval, eval harness, observability
+ cost), Phase 4 (deterministic agent tools, learning paths, quizzes). All nine
layers are now present; remaining work is upgrading internals (embedding
retrieval, LLM function-calling, LLM-judge evals). See `docs/architecture.md`.

## Agent tools (Phase 4)

- `lib/agent/tools/topic-tools.ts` — `getRelatedTopics`, `buildLearningPath` over
  the topic graph + ontology.
- `lib/agent/quiz.ts` — deterministic MCQ generation (no randomness → SSR-safe).
- Rendered by `components/{LearningPath,Quiz}.tsx` on the topic page.
- Keep these functions pure and deterministic; they're the seam for LLM
  function-calling later.

## New layers (Phase 3)

- `lib/retrieval` — lexical passage retrieval; the pipeline trims large topic
  bodies to the top-k relevant passages. Keep the `retrieve` contract stable so
  embeddings can replace the internals later.
- `lib/observability/{tracer,cost}` — one structured JSON log line per request.
- `evals/golden.json` + `src/routes/api/eval.ts` + `npm run eval` — retrieval
  grounding eval, no LLM key required.

## Verifying changes

Run `node_modules/.bin/tsc --noEmit` (or `npx tsc`) for type checks — must pass
clean. For prompt/pipeline/retrieval changes, also run `npm run eval` against a
dev server. Manual answer-quality rubric lives in `EVALS.md`.
