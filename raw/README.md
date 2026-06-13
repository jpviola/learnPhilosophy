# raw/ — source material (the "dump everything here" folder)

This is the **raw layer** of the compiled-knowledge-base pattern (Karpathy /
"Obsidian as IDE"). Drop unprocessed sources here — no organizing, no tagging:

- Articles, papers, or lecture notes converted to Markdown (`.md`) or plain text.
- Web clips, transcripts, book excerpts, your own notes.
- One file per source. Name them however you like.

**Never edit files in this folder by hand once dropped** — they are the source of
truth you can always re-compile from.

## How it flows

```
raw/  ──compile──▶  src/content/topics/*.md  ──▶  ontology + graph + tutor (RAG)
(sources)          (compiled knowledge)          (the app)
```

## Compiling

The compilation step is done by the **knowledge-compiler** agent
(`.claude/agents/knowledge-compiler.md`). In Claude Code:

> Use the knowledge-compiler agent to compile the new sources in raw/ into topics.

It reads existing topics + the master index, then creates or updates topic
Markdown files with the project's frontmatter schema and `relatedTopics`
backlinks. Compiled topics are picked up automatically by the app.

After compiling, regenerate the index and health report:

```bash
npm run knowledge
```
