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
| Query understanding | locale resolve + `agent/router` (intent) + `agent/query-rewriter` (anaphora) | done |
| Retrieval | `lib/retrieval` — lexical TF-IDF, or semantic embeddings when configured | done |
| Prompt management | `lib/prompts/templates` | done |
| Hallucination control | grounding via topic body + ontology; traceability instruction | partial |
| Security | `lib/security/{input-guard,output-filter}` | done |
| Evaluation | `evals/golden.json` + `/api/eval` (grounding + `?mode=live` LLM-judge) | done |
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

## Query understanding

Before generating, the route runs `agent/router.ts` (deterministic intent): a
greeting gets an instant localized reply with **no LLM call**; an explicit
"open X" surfaces that topic as a navigation action. The pipeline runs
`agent/query-rewriter.ts`, which expands short follow-up questions (anaphora like
"¿y él?") with the last substantive turn — for retrieval only, never changing the
question shown to the model.

## Retrieval

`lib/retrieval/index.ts` chunks a topic's markdown into ~600-char passages and
ranks them against the question. By default it uses lexical TF-IDF cosine (IDF
within the document) plus a phrase boost. When `NEBIUS_EMBED_MODEL` is set,
`retrieveContextAsync` ranks by embedding cosine similarity instead
(`lib/retrieval/embeddings.ts`, cached per chunk), falling back to lexical on any
error. The pipeline only retrieves when the body exceeds `RETRIEVAL_THRESHOLD`
(1500 chars). Same `retrieve` contract either way.

## Evaluation

`/api/eval` (dev only) has two modes. Default = **retrieval grounding** (no key):
checks the retrieval layer surfaces the golden key terms. `?mode=live` runs the
full pipeline per golden question and grades the answer with an **LLM judge**
(`lib/evals/judge.ts`, needs a provider key). `npm run eval` runs grounding;
`npm run eval -- --live` runs the judge.

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
