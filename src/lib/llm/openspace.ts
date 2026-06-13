import { trimHistory } from "~/lib/agent/conversation";
import type { AskRequest } from "~/lib/agent/types";

// OpenSpace MCP integration. When OPENSPACE_URL is set (e.g.
// http://127.0.0.1:8081/mcp), questions route through OpenSpace's skill system,
// which caches evolved skills so common questions skip a full LLM call.

export async function callOpenSpace(
  url: string,
  req: AskRequest
): Promise<ReadableStream<Uint8Array>> {
  const history = trimHistory(req.history);

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "philosophy_qa",
      arguments: {
        question: req.question,
        topic: req.topicName,
        context: req.topicDescription,
        body: req.topicBody,
        ontology: req.ontologyContext,
        resources: req.resourceTitles,
        locale: req.locale,
        history,
      },
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) throw new Error(`OpenSpace responded ${res.status}`);
  const data = await res.json();
  const text =
    data?.result?.content?.[0]?.text ?? "No response from OpenSpace.";

  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}
