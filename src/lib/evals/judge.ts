import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// LLM-as-judge for answer-quality evals. Grades a tutor answer against the golden
// expected key points and returns a structured verdict. Needs a provider key; the
// eval route only calls this in live mode.

export interface Judgment {
  score: number; // 0..1
  covered: string[];
  missing: string[];
  verdict: string;
}

const SYSTEM = `You grade a philosophy tutor's answer against a list of expected key points. Respond ONLY with a single JSON object, no prose and no code fences:
{"covered": string[], "missing": string[], "score": number, "verdict": string}
"covered" = the expected key points the answer adequately addresses; "missing" = the rest. "score" = a number from 0 to 1 reflecting coverage and factual accuracy. "verdict" = one short sentence.`;

function buildUser(question: string, answer: string, expected: string[]): string {
  return `Question: ${question}\n\nExpected key points:\n${expected
    .map((e) => `- ${e}`)
    .join("\n")}\n\nTutor's answer:\n${answer}`;
}

async function complete(system: string, user: string): Promise<string> {
  const nebiusKey = process.env.NEBIUS_API_KEY;
  if (nebiusKey) {
    const client = new OpenAI({ baseURL: "https://api.tokenfactory.nebius.com/v1/", apiKey: nebiusKey });
    const model = process.env.NEBIUS_MODEL ?? "MiniMaxAI/MiniMax-M2.5-fast";
    const res = await client.chat.completions.create({
      model,
      max_tokens: 512,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
  throw new Error("No judge provider configured");
}

/** Deterministic fallback when the judge JSON can't be parsed. */
function lexicalFallback(answer: string, expected: string[]): Judgment {
  const norm = answer.toLowerCase();
  const covered = expected.filter((e) => norm.includes(e.toLowerCase()));
  const missing = expected.filter((e) => !covered.includes(e));
  return {
    score: expected.length ? covered.length / expected.length : 0,
    covered,
    missing,
    verdict: "Scored by lexical fallback (judge JSON unparseable).",
  };
}

export async function judgeAnswer(
  question: string,
  answer: string,
  expected: string[]
): Promise<Judgment> {
  const raw = await complete(SYSTEM, buildUser(question, answer, expected));
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return lexicalFallback(answer, expected);
  try {
    const parsed = JSON.parse(match[0]) as Partial<Judgment>;
    return {
      score: typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0,
      covered: Array.isArray(parsed.covered) ? parsed.covered : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing : expected,
      verdict: typeof parsed.verdict === "string" ? parsed.verdict : "",
    };
  } catch {
    return lexicalFallback(answer, expected);
  }
}
