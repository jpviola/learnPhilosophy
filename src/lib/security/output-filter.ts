// Strips chain-of-thought blocks (e.g. DeepSeek-R1 "<think>...</think>") from a
// token stream so internal reasoning never reaches the learner. Stateful across
// chunks because the tags can be split across stream boundaries.

const OPEN = "<think>";
const CLOSE = "</think>";

/** Longest suffix of `s` that is a (proper) prefix of `tag` — a possible split tag. */
function danglingPrefixLen(s: string, tag: string): number {
  const max = Math.min(s.length, tag.length - 1);
  for (let len = max; len > 0; len--) {
    if (tag.startsWith(s.slice(s.length - len))) return len;
  }
  return 0;
}

export function createThinkFilter() {
  let inside = false;
  let buffer = "";

  function process(chunk: string): string {
    buffer += chunk;
    let out = "";

    while (true) {
      if (!inside) {
        const i = buffer.indexOf(OPEN);
        if (i !== -1) {
          out += buffer.slice(0, i);
          buffer = buffer.slice(i + OPEN.length);
          inside = true;
          continue;
        }
        // No opening tag: emit all but a possible partial "<think>" at the end.
        const keep = danglingPrefixLen(buffer, OPEN);
        out += buffer.slice(0, buffer.length - keep);
        buffer = buffer.slice(buffer.length - keep);
        break;
      } else {
        const i = buffer.indexOf(CLOSE);
        if (i !== -1) {
          buffer = buffer.slice(i + CLOSE.length);
          inside = false;
          continue;
        }
        // Still reasoning: discard all but a possible partial "</think>".
        const keep = danglingPrefixLen(buffer, CLOSE);
        buffer = buffer.slice(buffer.length - keep);
        break;
      }
    }
    return out;
  }

  /** Flush buffered text once the stream ends (emit only if not mid-reasoning). */
  function flush(): string {
    const rest = inside ? "" : buffer;
    buffer = "";
    return rest;
  }

  return { process, flush };
}
