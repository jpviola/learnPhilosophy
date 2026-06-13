import type { APIEvent } from "@solidjs/start/server";
import { runAskPipeline } from "~/lib/agent/pipeline";
import { guardRequest, rateLimit, clientKey } from "~/lib/security/input-guard";
import { startTrace } from "~/lib/observability/tracer";
import { resolveLocale } from "~/i18n/locale";
import type { AskRequest } from "~/lib/agent/types";

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

  const trace = startTrace("ask");
  const inputChars = inputCharCount(req);

  try {
    const { stream, provider, retrieved } = await runAskPipeline(req);

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

    return new Response(counted, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    trace.end({ status: "error", error: message, inputChars });
    // No provider configured is a 503; everything else is an upstream failure.
    const status = /no llm provider/i.test(message) ? 503 : 502;
    return json({ error: message }, status);
  }
}
