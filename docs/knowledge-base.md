# Compiled knowledge base

LearnPhilosophy uses the "compiled knowledge base" pattern (Karpathy / "Obsidian
as the IDE, the LLM as the programmer"). Instead of re-deriving knowledge on every
query, sources are **compiled once** into structured, cross-linked topics that the
app turns into an ontology, a graph, and the tutor's grounding context.

## The three layers

| Karpathy pattern | Here |
|---|---|
| `raw/` (sources) | `raw/` — drop unprocessed material; never edited by hand |
| `knowledge/` (compiled) | `src/content/topics/*.md` — the topics the app renders |
| `outputs/` (deliverables) | `outputs/` — generated reports, syntheses, health checks |
| Obsidian (IDE) | the repo + your editor |
| Cowork (the programmer) | the `knowledge-compiler` agent (`.claude/agents/`) |
| `[[backlinks]]` | `relatedTopics:` frontmatter slugs |
| master `_index.md` | `src/content/topics/_index.md` (auto-generated) |

```
raw/  ──compile (agent)──▶  src/content/topics/*.md  ──▶  ontology + graph + tutor RAG
```

The knowledge layer already existed; this adds the missing `raw/` source layer, the
compile agent, a self-maintained index, and a health check.

## Compiling new sources

1. Drop sources into `raw/` (Markdown or text — see `raw/README.md`).
2. In Claude Code, run the compile agent:
   > Use the knowledge-compiler agent to compile the new sources in raw/.
   It reads the index + existing topics and creates/updates topic files with the
   project's frontmatter schema and `relatedTopics` backlinks. It never edits `raw/`.
3. Regenerate the index and health report:
   ```bash
   npm run knowledge
   ```

## `npm run knowledge` (deterministic, no LLM)

Regenerates `src/content/topics/_index.md` and writes
`outputs/health-check-<date>.md`. The health check flags:

- **Broken backlinks** — `relatedTopics` pointing to a slug no topic provides.
- **Missing frontmatter** — topics without `tagline` / `category` / `tags`.
- **Orphan topics** — no links in or out (invisible in the graph).
- **Duplicate slugs**, and **uncompiled raw sources** still sitting in `raw/`.

Run it after every compile, and fix what it flags — this is what keeps the base
"self-healing" instead of quietly drifting.

## How it feeds the app

Compiled topics are loaded by `src/lib/content.ts` (which skips `_`-prefixed files
like `_index.md`), assembled in `src/lib/topics.ts`, typed into the knowledge graph
by `src/lib/ontology.ts`, organized by `src/lib/palace.ts`, and rendered into the
landing graph, the topic pages, and the tutor's RAG context. So a well-compiled
topic automatically becomes a graph node, an ontology entity, and grounding for the
tutor — no extra wiring.
