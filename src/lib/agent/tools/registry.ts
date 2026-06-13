import { searchTopics } from "~/lib/topics";
import { getRelatedTopics, buildLearningPath } from "./topic-tools";

// The tools the tutor can call during a conversation to navigate the topic graph
// and build study routes. Each tool returns a `result` (fed back to the model) and
// `actions` (surfaced to the UI as clickable topic links / a learning path).

export interface TutorAction {
  type: "topic" | "path";
  slug?: string;
  name?: string;
  steps?: { slug: string; name: string; role: string }[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "search_topics",
    description:
      "Search the philosophy topic library by keyword or phrase. Use to find which topics exist that relate to the user's question.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "A topic name, philosopher, or concept to search for." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_related_topics",
    description:
      "Given a topic slug, list the topics most closely connected to it in the knowledge graph (by links, category, and shared tags).",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The slug of an existing topic, e.g. 'stoicism' or 'kant'." },
      },
      required: ["slug"],
    },
  },
  {
    name: "build_learning_path",
    description:
      "Build an ordered study path around a topic: foundational topics, the topic itself, then sensible next steps. Use when the user asks where to start or what to learn next.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The slug of the topic to build a path around." },
      },
      required: ["slug"],
    },
  },
];

export interface ToolOutcome {
  result: unknown;
  actions: TutorAction[];
}

export function executeTool(name: string, args: Record<string, unknown>): ToolOutcome {
  switch (name) {
    case "search_topics": {
      const topics = searchTopics(String(args.query ?? "")).slice(0, 5);
      return {
        result: topics.map((t) => ({ slug: t.slug, name: t.name, tagline: t.tagline })),
        actions: topics.map((t) => ({ type: "topic", slug: t.slug, name: t.name })),
      };
    }
    case "get_related_topics": {
      const topics = getRelatedTopics(String(args.slug ?? ""), 5);
      return {
        result: topics.map((t) => ({ slug: t.slug, name: t.name, tagline: t.tagline })),
        actions: topics.map((t) => ({ type: "topic", slug: t.slug, name: t.name })),
      };
    }
    case "build_learning_path": {
      const steps = buildLearningPath(String(args.slug ?? "")).map((s) => ({
        slug: s.topic.slug,
        name: s.topic.name,
        role: s.role,
      }));
      return {
        result: steps,
        actions: steps.length ? [{ type: "path", steps }] : [],
      };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` }, actions: [] };
  }
}

/** De-duplicates actions (topics by slug; keeps the first path). */
export function dedupeActions(actions: TutorAction[]): TutorAction[] {
  const seen = new Set<string>();
  const out: TutorAction[] = [];
  let hasPath = false;
  for (const a of actions) {
    if (a.type === "path") {
      if (hasPath) continue;
      hasPath = true;
      out.push(a);
    } else if (a.slug && !seen.has(a.slug)) {
      seen.add(a.slug);
      out.push(a);
    }
  }
  return out;
}
