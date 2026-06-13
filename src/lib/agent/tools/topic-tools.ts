import { ALL_TOPICS, getTopicBySlug, type Topic } from "~/lib/topics";

// Deterministic "tools" the agent (and the UI) can call to reason over the topic
// graph and ontology. They are plain functions today; the same signatures are the
// seam for exposing them to an LLM via function-calling later.

/** Topics related to `slug` via graph edges, shared category, or shared tags. */
export function getRelatedTopics(slug: string, limit = 6): Topic[] {
  const topic = getTopicBySlug(slug);
  if (!topic) return [];

  const linked = new Set<string>();
  for (const node of topic.relatedNodes) linked.add(node.id);
  for (const edge of topic.edges) linked.add(edge.target);

  const scored = ALL_TOPICS.filter((t) => t.slug !== slug).map((t) => {
    let score = 0;
    if (linked.has(t.id) || linked.has(t.slug)) score += 5;
    if (t.category === topic.category) score += 2;
    score += t.tags.filter((tag) => topic.tags.includes(tag)).length;
    return { topic: t, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.topic);
}

export interface PathStep {
  topic: Topic;
  /** Why this step is here: a prerequisite, the focus, or a next step. */
  role: "foundation" | "focus" | "next";
}

/**
 * Builds an ordered study path around a topic: a couple of same-category
 * foundations, the topic itself, then related topics as next steps.
 */
export function buildLearningPath(slug: string, max = 5): PathStep[] {
  const topic = getTopicBySlug(slug);
  if (!topic) return [];

  const related = getRelatedTopics(slug, 10);

  const foundations = related
    .filter((t) => t.category === topic.category)
    .slice(0, 2)
    .map((t): PathStep => ({ topic: t, role: "foundation" }));

  const foundationSlugs = new Set(foundations.map((s) => s.topic.slug));
  const next = related
    .filter((t) => !foundationSlugs.has(t.slug))
    .slice(0, max - foundations.length - 1)
    .map((t): PathStep => ({ topic: t, role: "next" }));

  return [...foundations, { topic, role: "focus" }, ...next];
}
