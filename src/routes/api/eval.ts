import type { APIEvent } from "@solidjs/start/server";
import golden from "../../../evals/golden.json";
import { getContentBySlug } from "~/lib/content";
import { getTopicBySlug } from "~/lib/topics";
import { retrieveContext } from "~/lib/retrieval";
import { runAskPipeline } from "~/lib/agent/pipeline";
import { judgeAnswer } from "~/lib/evals/judge";
import type { AskRequest } from "~/lib/agent/types";

// Eval endpoint. Default mode is offline retrieval-grounding (no LLM key, CI-safe):
// it checks the retrieval layer surfaces the expected key terms. ?mode=live runs
// the full pipeline and grades each answer with an LLM judge (needs a provider
// key). Disabled in production.

interface GoldenItem {
  slug: string;
  question: string;
  expect: string[];
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

async function runLiveEval(items: GoldenItem[], threshold: number) {
  const results = [];
  for (const item of items) {
    const topic = getTopicBySlug(item.slug);
    const content = getContentBySlug(item.slug);
    const req: AskRequest = {
      question: item.question,
      topicName: topic?.name ?? item.slug,
      topicDescription: topic?.description ?? topic?.tagline ?? "",
      topicCategory: topic?.category ?? "",
      topicBody: content?.body,
      resourceTitles: [],
      locale: "es",
    };
    const { stream } = await runAskPipeline(req);
    const answer = await readStream(stream);
    const judgment = await judgeAnswer(item.question, answer, item.expect);
    results.push({ slug: item.slug, question: item.question, ...judgment });
  }
  const passed = results.filter((r) => r.score >= threshold).length;
  return {
    mode: "live",
    total: items.length,
    passed,
    passRate: Number((passed / Math.max(1, items.length)).toFixed(3)),
    threshold,
    ok: passed / Math.max(1, items.length) >= threshold,
    results,
  };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function GET(event: APIEvent) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const items = golden.items as GoldenItem[];
  const threshold = golden.threshold ?? 0.6;

  const mode = new URL(event.request.url).searchParams.get("mode");
  if (mode === "live") {
    if (!process.env.NEBIUS_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Live eval needs NEBIUS_API_KEY or ANTHROPIC_API_KEY." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    try {
      const report = await runLiveEval(items, threshold);
      return new Response(JSON.stringify(report, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

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
