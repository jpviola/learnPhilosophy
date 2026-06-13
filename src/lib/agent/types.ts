import type { Locale } from "~/i18n/locale";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** How deep / how much jargon the tutor uses. */
export type LearnerLevel = "beginner" | "intermediate" | "advanced";
export const LEARNER_LEVELS: LearnerLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

/** "explain" gives a direct answer; "socratic" guides with questions. */
export type TutorMode = "explain" | "socratic";
export const TUTOR_MODES: TutorMode[] = ["explain", "socratic"];

/** A single QA request as received from the client and consumed by the pipeline. */
export interface AskRequest {
  question: string;
  topicName: string;
  topicDescription: string;
  topicCategory: string;
  topicBody?: string;
  ontologyContext?: string;
  resourceTitles: string[];
  history?: ChatMessage[];
  /** Language the tutor must answer in. Defaults to the project default locale. */
  locale?: Locale;
  /** Difficulty register for the answer. Defaults to "intermediate". */
  level?: LearnerLevel;
  /** Teaching style. Defaults to "explain". */
  mode?: TutorMode;
  /** Short summary of the learner's history, injected to personalize answers. */
  learnerContext?: string;
}
