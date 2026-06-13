import OpenAI from "openai";

// Optional semantic retrieval. When NEBIUS_API_KEY + NEBIUS_EMBED_MODEL are set,
// chunks and queries are embedded and ranked by cosine similarity — the same
// `retrieve` contract as the lexical default, just better recall on paraphrases.
// Embeddings are cached per text (in process memory). If anything is unset or
// fails, callers fall back to lexical retrieval.

const cache = new Map<string, number[]>();
let client: OpenAI | null = null;

export function embeddingsEnabled(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY && process.env.NEBIUS_EMBED_MODEL);
}

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://api.tokenfactory.nebius.com/v1/",
      apiKey: process.env.NEBIUS_API_KEY,
    });
  }
  return client;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Embeds many texts, batching the uncached ones into a single API call. */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const model = process.env.NEBIUS_EMBED_MODEL!;
  const missing: string[] = [];
  for (const t of texts) {
    const k = hash(t);
    if (!cache.has(k)) missing.push(t);
  }
  if (missing.length > 0) {
    const res = await getClient().embeddings.create({ model, input: missing });
    res.data.forEach((d, i) => cache.set(hash(missing[i]), d.embedding as number[]));
  }
  return texts.map((t) => cache.get(hash(t))!);
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embedMany([text]))[0];
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
