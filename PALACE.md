# 🏰 MemPalace: LearnPhilosophy World Map

This project uses the **MemPalace Architecture** to organize philosophical knowledge. This file serves as a persistent context layer for AI agents.

## 🦅 Wings (Major Domains)
- **Ancient Philosophy**: The roots of Western thought (Plato, Aristotle, Stoicism).
- **Medieval Philosophy**: The era of Faith and Reason (Aquinas, Augustine).
- **Modern Philosophy**: Rationalism, Empiricism, and Existentialism.
- **Logic**: The science of reasoning and argumentation.

## 🚪 Rooms (Thematic Clusters)
- **Ethics**: How to live (Virtue Ethics, Stoicism).
- **Epistemology**: What we know (Empiricism, Skepticism).
- **Metaphysics**: The nature of reality (Ontology, Mind-Body).
- **Formal Logic**: Syllogisms, Deduction, and Fallacies.

## 📂 Drawers (Core Content)
- 65+ Markdown topics in `src/content/topics/`.
- Interactive Force-Directed Graph for discovery.

## 🛠️ Technical Stack
- **Framework**: SolidJS + Vinxi (Fullstack).
- **Memory**: Custom `src/lib/palace.ts` hierarchy.
- **Graph**: Canvas-based physics simulation (`src/lib/graph/sim.ts`).

## 📜 Development Rules
- Verbatim storage of content (don't summarize Markdown).
- Spatial organization: Always assign a `category` (Wing) and `tags` (Room) to new content.
- Semantic connections: Use `relatedTopics` to build the knowledge graph.

## 🧠 AI Mental Model (Proposed)
- **Memory (RAG)**: Content from `.md` files is injected directly into the prompt via `topicBody`.
- **Thought (LLM)**: Using DeepSeek/Llama via Nebius for low-latency philosophical reasoning.
- **Context Engineering**: Strict history management (max 6 turns) to avoid "instruction drift" and optimize token usage.
- **Measurement (Evals)**: Use `EVALS.md` golden dataset to verify response quality after any prompt change.
