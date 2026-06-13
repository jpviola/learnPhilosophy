import { ALL_TOPICS, type Topic } from "~/lib/topics";

// Deterministic quiz generation from topic metadata + the ontology graph. No
// randomness, so server and client render the same questions (no hydration
// mismatch) and the set is reproducible. An LLM-generated quiz could later
// implement the same QuizQuestion contract for richer, free-text questions.

export interface QuizQuestion {
  id: string;
  type: "category" | "author" | "related";
  /** The entity the question is about (topic name or work title). */
  subject: string;
  options: string[];
  answerIndex: number;
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Rotates options deterministically so the answer isn't always first. */
function placeAnswer(
  answer: string,
  distractors: string[],
  seed: string
): { options: string[]; answerIndex: number } {
  const base = [answer, ...distractors];
  const r = stableHash(seed) % base.length;
  const options = [...base.slice(r), ...base.slice(0, r)];
  return { options, answerIndex: (base.length - r) % base.length };
}

function uniqueCategories(): string[] {
  return Array.from(new Set(ALL_TOPICS.map((t) => t.category))).filter(Boolean);
}

function categoryQuestion(topic: Topic): QuizQuestion | null {
  const distractors = uniqueCategories()
    .filter((c) => c !== topic.category)
    .slice(0, 3);
  if (distractors.length < 2 || !topic.category) return null;
  const { options, answerIndex } = placeAnswer(
    topic.category,
    distractors,
    `cat:${topic.slug}`
  );
  return { id: `cat:${topic.slug}`, type: "category", subject: topic.name, options, answerIndex };
}

function authorQuestion(topic: Topic): QuizQuestion | null {
  const work = topic.resources.find((r) => r.author);
  if (!work?.author) return null;
  const distractors = Array.from(
    new Set(
      ALL_TOPICS.flatMap((t) => t.resources)
        .map((r) => r.author)
        .filter((a): a is string => Boolean(a) && a !== work.author)
    )
  ).slice(0, 3);
  if (distractors.length < 2) return null;
  const { options, answerIndex } = placeAnswer(work.author, distractors, `auth:${work.id}`);
  return { id: `auth:${topic.slug}`, type: "author", subject: work.title, options, answerIndex };
}

function relatedQuestion(topic: Topic): QuizQuestion | null {
  const ownLabels = topic.relatedNodes
    .filter((n) => n.id !== topic.id && n.id !== topic.slug)
    .map((n) => n.label);
  const answer = ownLabels[0];
  if (!answer) return null;

  const ownSet = new Set(ownLabels.map((l) => l.toLowerCase()));
  ownSet.add(topic.name.toLowerCase());

  const distractors = Array.from(
    new Set(
      ALL_TOPICS.filter((t) => t.slug !== topic.slug)
        .flatMap((t) => t.relatedNodes.map((n) => n.label))
        .filter((l) => !ownSet.has(l.toLowerCase()))
    )
  ).slice(0, 3);
  if (distractors.length < 2) return null;

  const { options, answerIndex } = placeAnswer(answer, distractors, `rel:${topic.slug}`);
  return { id: `rel:${topic.slug}`, type: "related", subject: topic.name, options, answerIndex };
}

/** Builds up to `max` multiple-choice questions for a topic; [] if not enough data. */
export function buildQuiz(topic: Topic, max = 3): QuizQuestion[] {
  return [categoryQuestion(topic), relatedQuestion(topic), authorQuestion(topic)]
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, max);
}
