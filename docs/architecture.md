# Architecture

LearnPhilosophy is a SolidStart (SSR) app with an AI tutor. The chat endpoint is
a thin HTTP handler; everything else lives in composable layers under `src/lib`,
mapped to the 9-layer production-AI reference.

## Request flow (a tutor turn)

```
Client (AskPanel / GlobalChatBar via useAsk)
  │  POST /api/ask  { question, topic*, history, locale, level, mode, learnerContext }
  ▼
routes/api/ask.ts          thin handler
  ├─ security/input-guard   rate limit · length caps · enum + shape validation
  ├─ observability/tracer    start trace (latency, provider, tokens, cost)
  ▼
lib/agent/pipeline.ts       orchestration
  ├─ lib/retrieval           pick top-k passages from the topic body (if large)
  ├─ lib/prompts/templates   system prompt: topic + ontology + level + mode + language
  ├─ lib/llm/provider        Nebius → Anthropic → OpenSpace, runtime fallback
  └─ security/output-filter  strip <think> reasoning across stream chunks
  ▼
  streamed text/plain  ──► counted for cost ──► trace.end()
```

## Layers → 9-layer reference

| Reference layer | Here | Status |
|---|---|---|
| Query understanding | locale resolve; (router/rewriter planned) | partial |
| Retrieval | `lib/retrieval` — lexical TF-IDF over topic passages | lexical (embeddings = future) |
| Prompt management | `lib/prompts/templates` | done |
| Hallucination control | grounding via topic body + ontology; traceability instruction | partial |
| Security | `lib/security/{input-guard,output-filter}` | done |
| Evaluation | `evals/golden.json` + `/api/eval` + `npm run eval` | retrieval-grounding |
| Monitoring | `lib/observability/tracer` (structured JSON logs) | done |
| Cost | `lib/observability/cost` (token + USD estimate) | done |
| Agent structure | `lib/agent/*`, levels + Socratic mode, learner memory | done |
| Tool use | `lib/agent/tools/*`, learning paths, quizzes, LLM function-calling | done |

## Tools, learning paths, and quizzes (Phase 4)

`lib/agent/tools/topic-tools.ts` exposes deterministic functions over the topic
graph + ontology (`getRelatedTopics`, `buildLearningPath`). `lib/agent/quiz.ts`
generates multiple-choice questions from topic metadata and the ontology, with no
randomness so SSR and client agree. The topic page renders an interactive
`LearningPath` (a study route that marks topics the learner has already visited)
and a `Quiz` (instant feedback, score).

When a chat turn sets `tools: true` (the global chat bar does), the pipeline runs
the **agentic loop** (`lib/agent/agentic.ts`): the model may call `search_topics`,
`get_related_topics`, and `build_learning_path` (`lib/agent/tools/registry.ts`)
across up to a few rounds, then streams its final answer. Tool calls also produce
`actions` (topics + a learning path) returned to the client in the
`X-Tutor-Actions` header, which the chat bar renders as clickable links and a path.
Works on the Nebius (OpenAI-compatible) and Anthropic providers; falls back to a
plain answer if the agentic loop fails.

## Retrieval

`lib/retrieval/index.ts` chunks a topic's markdown into ~600-char passages and
ranks them against the question with TF-IDF cosine (IDF computed within the
document) plus a phrase-match boost. The pipeline only invokes it when the body
exceeds `RETRIEVAL_THRESHOLD` (1500 chars); smaller bodies pass through whole.
The `retrieve` contract is the seam where embedding-based semantic search can be
dropped in later without touching the pipeline.

## Evaluation

`evals/golden.json` holds questions with expected key terms. `/api/eval` (dev
only) checks that retrieval surfaces those terms — no LLM key needed, CI-friendly.
`npm run eval` runs it against a dev server and exits non-zero below threshold.
A live answer-quality mode (LLM-judge) is a future addition.

## Observability

Each request emits one JSON line via `lib/observability/tracer`: duration,
provider, locale/level/mode, whether retrieval fired, estimated input/output
tokens, and estimated USD cost. Ship stdout to any aggregator; this is where
OpenTelemetry would plug in.

## Internationalization

Hybrid: UI strings are fully localized (`src/i18n`, es/en/pt/it/fr); topic
content stays in its source language and the tutor translates on the fly via the
prompt's language directive. Locale is resolved from a cookie (SSR-consistent).

Topic bodies are translated on demand: when the body's `lang` frontmatter differs
from the UI locale, the topic page calls `POST /api/translate`, which translates
the markdown via the LLM and caches it in process memory (`lib/translate.ts`,
keyed by content hash, with in-flight de-duplication). The page shows an
"AI-translated" badge and a "show original" toggle; on any failure it falls back
to the original body.
