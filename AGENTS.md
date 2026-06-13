# AGENTS.md

This file documents the agentic design of LearnPhilosophy for contributors and
coding agents. (For build/run/convention guidance, see `CLAUDE.md`.)

## The tutor turn

A single chat turn flows through `src/lib/agent/pipeline.ts`:

1. **Guard** (`security/input-guard.ts`) — rate limit, length caps, history shape.
2. **Prompt** (`prompts/templates.ts`) — system prompt assembled from topic
   context, resources, the ontology map, the topic markdown body, and a
   **language directive** forcing the answer into the user's locale.
3. **Provider** (`llm/provider.ts`) — first available of Nebius → Anthropic →
   OpenSpace, with runtime fallback if a provider fails before streaming.
4. **Output filter** (`security/output-filter.ts`) — strips `<think>…</think>`
   reasoning blocks across stream chunks so internal reasoning never reaches the
   learner.

## Grounding

Answers are grounded by two mechanisms injected into the prompt:

- **Topic markdown** (`src/content/topics/*.md`) — the "core knowledge base".
- **Ontology** (`src/lib/ontology.ts`) — a typed, validated graph of entities and
  relations with source provenance. The tutor is told to prefer ontology
  relations when explaining how ideas connect, and to preserve traceability.

This is prompt-stuffing today, not retrieval. Real retrieval (embeddings over the
markdown) is Phase 3 (`src/lib/retrieval/`).

## Agentic capabilities (built)

- **Tutoring** — Socratic mode + difficulty levels in `prompts/templates.ts`;
  learner memory in `lib/learner.ts` (injected as `learnerContext`).
- **Tools** — `agent/tools/topic-tools.ts` (`getRelatedTopics`,
  `buildLearningPath`) and `agent/quiz.ts`, surfaced by the `LearningPath` and
  `Quiz` components, and exposed to the model via function-calling.
- **LLM tool use** — `agent/agentic.ts` runs a tool-calling loop when a turn sets
  `tools: true` (the global chat bar). The model calls `search_topics`,
  `get_related_topics`, `build_learning_path` (`agent/tools/registry.ts`), then
  streams its answer; tool results return as `actions` via the `X-Tutor-Actions`
  header for the UI to render. Falls back to a plain answer on failure.
- **Retrieval** — `lib/retrieval` (lexical; embeddings later).
- **Eval / observability** — `evals/` + `/api/eval`, `lib/observability/`.

## Still future

- **Query understanding** — `agent/router.ts`, `agent/query-rewriter.ts`.
- **Embedding retrieval** and an **LLM-judge** eval mode.

When adding an agentic capability, give it a home in these directories rather than
expanding the HTTP handler.
