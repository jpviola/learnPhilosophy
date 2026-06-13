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
  `Quiz` components. Deterministic today; the seam for LLM function-calling.
- **Retrieval** — `lib/retrieval` (lexical; embeddings later).
- **Eval / observability** — `evals/` + `/api/eval`, `lib/observability/`.

## Still future

- **Query understanding** — `agent/router.ts`, `agent/query-rewriter.ts`.
- **LLM-driven tool use** — give the model the `topic-tools` functions via
  function-calling so it can navigate/path/quiz inside a conversation.

When adding an agentic capability, give it a home in these directories rather than
expanding the HTTP handler.
