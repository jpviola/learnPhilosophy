import type { APIEvent } from "@solidjs/start/server";
import golden from "../../../evals/golden.json";
import { getContentBySlug } from "~/lib/content";
import { retrieveContext } from "~/lib/retrieval";

// Offline retrieval-grounding eval. For each golden question it checks that the
// retrieval layer surfaces the expected key terms from the topic body. Needs no
// LLM key, so it can run in CI. Disabled in production.

interface GoldenItem {
  slug: string;
  question: string;
  expect: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function GET(_event: APIEvent) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const items = golden.items as GoldenItem[];
  const threshold = golden.threshold ?? 0.6;

  const results = items.map((item) => {
    const body = getContentBySlug(item.slug)?.body;
    if (!body) {
      return { ...item, score: 0, missing: item.expect, skipped: true };
    }
    const context = normalize(retrieveContext(body, item.question, 4));
    const missing = item.expect.filter((term) => !context.includes(normalize(term)));
    const score = (item.expect.length - missing.length) / item.expect.length;
    return { ...item, score, missing, skipped: false };
  });

  const scored = results.filter((r) => !r.skipped);
  const passed = scored.filter((r) => r.score >= threshold).length;
  const passRate = scored.length ? passed / scored.length : 0;

  return new Response(
    JSON.stringify(
      {
        total: items.length,
        evaluated: scored.length,
        passed,
        passRate: Number(passRate.toFixed(3)),
        threshold,
        ok: passRate >= threshold,
        results,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
}
