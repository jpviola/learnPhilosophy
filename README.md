# LearnPhilosophy

An AI tutor that teaches philosophy through an interactive knowledge graph and a
grounded chat. The landing page renders topics as a force-directed graph; each
topic page offers curated resources, a local knowledge map, and an "Ask the
tutor" panel whose answers are grounded in the topic's content and a typed
ontology.

## Stack

- **Framework:** SolidJS + SolidStart (Vinxi), SSR enabled.
- **Styling:** Tailwind CSS.
- **Graph:** Canvas force simulation (`src/lib/graph/sim.ts`).
- **LLM backends:** Nebius Token Factory (OpenAI-compatible, default), Anthropic
  Claude, or an OpenSpace MCP endpoint. Selected by which env vars are set, with
  runtime fallback in that order.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in at least one provider key
npm run dev            # http://localhost:3000
```

Build and run production:

```bash
npm run build
npm run start
```

## Environment

Set **at least one** provider (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NEBIUS_API_KEY` | Nebius Token Factory key (primary, cheapest). |
| `NEBIUS_MODEL` | Override model. Default: `MiniMaxAI/MiniMax-M2.5-fast` (non-reasoning). |
| `NEBIUS_EMBED_MODEL` | Optional. Enables semantic (embedding) retrieval; lexical if unset. |
| `ANTHROPIC_API_KEY` | Anthropic Claude (fallback). |
| `OPENSPACE_URL` | OpenSpace MCP endpoint (skill caching). |

Priority: `NEBIUS_API_KEY` → `ANTHROPIC_API_KEY` → `OPENSPACE_URL`.

## Architecture (agent pipeline)

The chat endpoint is a thin HTTP handler; the work lives in composable layers
under `src/lib`, mirroring a production AI stack:

```
src/routes/api/ask.ts      HTTP handler: rate limit → validate → pipeline → stream
src/lib/agent/pipeline.ts  Orchestrates provider selection + output filtering
src/lib/llm/               Provider adapters (nebius, anthropic, openspace) + fallback
src/lib/prompts/           System-prompt templates (locale-aware)
src/lib/security/          input-guard (limits, rate limit), output-filter (<think>)
src/lib/agent/             conversation (history), types
src/lib/ontology.ts        Typed, validated knowledge graph injected into prompts
src/lib/content.ts         Loads topic markdown from src/content/topics/*.md
src/i18n/locale.ts         Supported locales (es, en, pt, it, fr)
```

### Adding a topic

Create a markdown file in `src/content/topics/` following `_template.md`
(frontmatter: `id`, `name`, `tagline`, `category`, `tags`, `relatedTopics`).
It is picked up automatically.

### Evals

`evals/golden.json` holds questions with expected key terms. The offline
retrieval-grounding eval needs no LLM key:

```bash
npm run dev            # in one terminal
npm run eval           # retrieval grounding (no key, CI-safe)
npm run eval -- --live # full pipeline + LLM judge (needs a provider key)
```

`EVALS.md` keeps the original manual answer-quality rubric for reference.

### Observability

Every `/api/ask` request logs one structured JSON line (duration, provider,
estimated tokens + USD cost, whether retrieval fired) to stdout. See
`src/lib/observability/`.

### Knowledge base (compile sources into topics)

Drop sources into `raw/`, compile them into topics with the `knowledge-compiler`
agent, then regenerate the master index + health report:

```bash
npm run knowledge   # writes src/content/topics/_index.md + outputs/health-check-*.md
```

See [docs/knowledge-base.md](docs/knowledge-base.md) for the full
compiled-knowledge-base flow (`raw/` → topics → ontology + graph + tutor).

### Architecture

See [docs/architecture.md](docs/architecture.md) for the full request flow and
the mapping to the 9-layer production-AI reference.
