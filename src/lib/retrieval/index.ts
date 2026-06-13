// Lexical retrieval over a single topic's markdown body. Instead of stuffing the
// whole document into the prompt, we split it into passages and return only the
// ones most relevant to the question (TF-IDF cosine + phrase boost). This is
// deterministic and dependency-free; semantic (embedding) retrieval is a future
// upgrade that can implement the same `retrieve` contract.

// A small multilingual stopword set (es/en/pt/it/fr function words).
const STOPWORDS = new Set(
  (
    "the a an of to in on and or but is are was were be been being it its this that these those for with as by at from " +
    "el la los las un una unos unas de del a en y o pero es son era con como por para que se su sus lo al " +
    "o a os as um uma uns umas de do da dos das e ou mas com como por para que se seu " +
    "il lo la i gli le un uno una di del della e o ma con come per che si suo " +
    "le les des du de un une et ou mais avec comme pour que se son ses dans sur"
  ).split(/\s+/)
);

export interface Chunk {
  text: string;
  index: number;
}

export interface ScoredChunk extends Chunk {
  score: number;
}

const CHUNK_TARGET = 600; // approx chars per passage

const DIACRITICS = /[̀-ͯ]/g;

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((tok) => tok.length > 1 && !STOPWORDS.has(tok));
}

/** Splits markdown into passages, grouping paragraphs up to ~CHUNK_TARGET chars. */
export function chunkMarkdown(body: string): Chunk[] {
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = "";
  for (const block of blocks) {
    if (buffer && buffer.length + block.length > CHUNK_TARGET) {
      chunks.push({ text: buffer, index: chunks.length });
      buffer = block;
    } else {
      buffer = buffer ? `${buffer}\n\n${block}` : block;
    }
  }
  if (buffer) chunks.push({ text: buffer, index: chunks.length });
  return chunks;
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
  return tf;
}

/** Returns the top-k passages of `body` most relevant to `query`. */
export function retrieve(body: string, query: string, k = 4): ScoredChunk[] {
  const chunks = chunkMarkdown(body);
  if (chunks.length <= k) {
    return chunks.map((c) => ({ ...c, score: 1 }));
  }

  const chunkTokens = chunks.map((c) => tokenize(c.text));
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return chunks.slice(0, k).map((c) => ({ ...c, score: 0 }));
  }

  // IDF across the document's own passages.
  const df = new Map<string, number>();
  for (const tokens of chunkTokens) {
    for (const term of new Set(tokens)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const N = chunks.length;
  const idf = (term: string) => Math.log(1 + N / (1 + (df.get(term) ?? 0)));

  const queryTf = termFreq(queryTokens);
  const normalizedQuery = normalize(query);

  const scored = chunks.map((chunk, i) => {
    const tf = termFreq(chunkTokens[i]);
    let dot = 0;
    let chunkNorm = 0;
    let queryNorm = 0;

    for (const [term, qf] of queryTf) {
      const w = idf(term);
      const qWeight = qf * w;
      const cWeight = (tf.get(term) ?? 0) * w;
      dot += qWeight * cWeight;
      queryNorm += qWeight * qWeight;
    }
    for (const [term, cf] of tf) {
      const cWeight = cf * idf(term);
      chunkNorm += cWeight * cWeight;
    }

    let score =
      queryNorm && chunkNorm ? dot / (Math.sqrt(queryNorm) * Math.sqrt(chunkNorm)) : 0;

    // Small boost when the chunk literally contains a multi-word query phrase.
    if (normalizedQuery.length > 8 && normalize(chunk.text).includes(normalizedQuery)) {
      score += 0.25;
    }

    return { ...chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .sort((a, b) => a.index - b.index); // keep original reading order
}

/** Convenience: the retrieved passages joined back into a single context string. */
export function retrieveContext(body: string, query: string, k = 4): string {
  return retrieve(body, query, k)
    .map((c) => c.text)
    .join("\n\n");
}

/**
 * Semantic retrieval when an embedding provider is configured, otherwise the
 * lexical default. Same contract as `retrieveContext`; safe to await everywhere.
 */
export async function retrieveContextAsync(
  body: string,
  query: string,
  k = 4
): Promise<string> {
  const { embeddingsEnabled, embedMany, embedOne, cosine } = await import("./embeddings");
  if (!embeddingsEnabled()) return retrieveContext(body, query, k);

  try {
    const chunks = chunkMarkdown(body);
    if (chunks.length <= k) return chunks.map((c) => c.text).join("\n\n");

    const [queryVec, chunkVecs] = await Promise.all([
      embedOne(query),
      embedMany(chunks.map((c) => c.text)),
    ]);

    return chunks
      .map((c, i) => ({ c, score: cosine(queryVec, chunkVecs[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .sort((a, b) => a.c.index - b.c.index)
      .map((x) => x.c.text)
      .join("\n\n");
  } catch {
    return retrieveContext(body, query, k);
  }
}
