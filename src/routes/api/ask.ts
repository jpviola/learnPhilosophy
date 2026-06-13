import type { APIEvent } from "@solidjs/start/server";
import { runAskPipeline } from "~/lib/agent/pipeline";
import { guardRequest, rateLimit, clientKey } from "~/lib/security/input-guard";
import { startTrace } from "~/lib/observability/tracer";
import { classifyIntent } from "~/lib/agent/router";
import { dedupeActions, type TutorAction } from "~/lib/agent/tools/registry";
import { serverT } from "~/i18n/server";
import { resolveLocale, DEFAULT_LOCALE } from "~/i18n/locale";
import type { AskRequest } from "~/lib/agent/types";

function textStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

const STREAM_HEADERS: Record<string, string> = {
  "Content-Type": "text/plain; charset=utf-8",
  "Transfer-Encoding": "chunked",
  "X-Content-Type-Options": "nosniff",
};

/** Estimates the characters sent to the model, for cost/observability. */
function inputCharCount(req: AskRequest): number {
  const history = (req.history ?? []).reduce((n, m) => n + m.content.length, 0);
  return (
    req.question.length +
    (req.topicBody?.length ?? 0) +
    (req.ontologyContext?.length ?? 0) +
    (req.learnerContext?.length ?? 0) +
    history
  );
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(event: APIEvent) {
  // Rate limit before doing any work.
  const limit = rateLimit(clientKey(event.request));
  if (!limit.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfter ?? 30),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const verdict = guardRequest(body);
  if (!verdict.ok) {
    return json({ error: verdict.error }, verdict.status);
  }

  const req = body as AskRequest;
  req.locale = resolveLocale(req.locale);
  const locale = req.locale ?? DEFAULT_LOCALE;

  const trace = startTrace("ask");
  const inputChars = inputCharCount(req);

  // Query understanding: greetings get an instant localized reply (no LLM call);
  // an explicit "open X" surfaces that topic as a navigation action.
  const route = classifyIntent(req.question);
  if (route.intent === "greeting") {
    const reply = serverT(locale, "chat.greetingReply");
    trace.end({ status: "ok", provider: "router", locale, inputChars, outputChars: reply.length });
    return new Response(textStream(reply), { headers: STREAM_HEADERS });
  }
  const routeActions: TutorAction[] =
    route.intent === "navigate" && route.topicSlug
      ? [{ type: "topic", slug: route.topicSlug, name: route.topicName }]
      : [];

  try {
    const { stream, provider, retrieved, actions } = await runAskPipeline(req);

    // Count streamed output for cost/observability without buffering the body.
    let outputChars = 0;
    const counted = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          outputChars += chunk.byteLength;
          controller.enqueue(chunk);
        },
        flush() {
          trace.end({
            status: "ok",
            provider,
            retrieved,
            locale: req.locale,
            level: req.level,
            mode: req.mode,
            inputChars,
            outputChars,
          });
        },
      })
    );

    // Tutor's navigation actions (topics/path) travel in a header, URI-encoded.
    // Router-detected navigation is merged in front of any tool-produced actions.
    const allActions = dedupeActions([...routeActions, ...actions]);
    const headers: Record<string, string> = { ...STREAM_HEADERS };
    if (allActions.length > 0) {
      headers["X-Tutor-Actions"] = encodeURIComponent(JSON.stringify(allActions));
    }

    return new Response(counted, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    trace.end({ status: "error", error: message, inputChars });
    // No provider configured is a 503; everything else is an upstream failure.
    const status = /no llm provider/i.test(message) ? 503 : 502;
    return json({ error: message }, status);
  }
}
