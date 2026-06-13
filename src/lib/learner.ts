import { createSignal } from "solid-js";
import { isServer } from "solid-js/web";
import type { LearnerLevel, TutorMode } from "~/lib/agent/types";

// Client-side memory of the learner (not the content). Lives in localStorage so
// it persists across visits without a backend. The chosen level is a reactive
// signal so every component (level toggles, chat bars) stays in sync.

const LEVEL_KEY = "lp_level";
const MODE_KEY = "lp_mode";
const VIEWED_KEY = "lp_viewed";
const QUESTIONS_KEY = "lp_questions";
const MAX_VIEWED = 12;
const MAX_QUESTIONS = 8;

interface ViewedTopic {
  slug: string;
  name: string;
}

const [level, setLevelSignal] = createSignal<LearnerLevel>("intermediate");
const [mode, setModeSignal] = createSignal<TutorMode>("explain");
export { level, mode };

function read<T>(key: string, fallback: T): T {
  if (isServer) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (isServer) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

/** Loads persisted state into reactive signals. Call once on the client. */
export function hydrateLearner() {
  if (isServer) return;
  const storedLevel = localStorage.getItem(LEVEL_KEY);
  if (
    storedLevel === "beginner" ||
    storedLevel === "intermediate" ||
    storedLevel === "advanced"
  ) {
    setLevelSignal(storedLevel);
  }
  const storedMode = localStorage.getItem(MODE_KEY);
  if (storedMode === "explain" || storedMode === "socratic") {
    setModeSignal(storedMode);
  }
}

export function setLevel(next: LearnerLevel) {
  setLevelSignal(next);
  write(LEVEL_KEY, next);
}

export function setMode(next: TutorMode) {
  setModeSignal(next);
  write(MODE_KEY, next);
}

export function recordTopicView(slug: string, name: string) {
  const list = read<ViewedTopic[]>(VIEWED_KEY, []).filter((v) => v.slug !== slug);
  list.unshift({ slug, name });
  write(VIEWED_KEY, list.slice(0, MAX_VIEWED));
}

export function recordQuestion(question: string) {
  const q = question.trim();
  if (!q) return;
  const list = read<string[]>(QUESTIONS_KEY, []).filter((x) => x !== q);
  list.unshift(q);
  write(QUESTIONS_KEY, list.slice(0, MAX_QUESTIONS));
}

export function getViewedTopics(): ViewedTopic[] {
  return read<ViewedTopic[]>(VIEWED_KEY, []);
}

/**
 * A compact, prompt-ready summary of what the learner has done so far. Kept short
 * on purpose; the tutor uses it to personalize, not to recite back.
 */
export function buildLearnerContext(): string {
  const viewed = getViewedTopics();
  const parts: string[] = [`Preferred level: ${level()}.`];
  if (viewed.length > 0) {
    parts.push(
      `Topics already explored: ${viewed
        .slice(0, 6)
        .map((v) => v.name)
        .join(", ")}.`
    );
  }
  return parts.join(" ");
}
