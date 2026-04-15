/**
 * Content loader — reads .md files from src/content/topics/
 *
 * Each file's frontmatter populates structured topic metadata.
 * The markdown body becomes the rich description shown on the topic page.
 *
 * Usage:
 *   import { getContentBySlug, getAllContent } from "~/lib/content";
 *   const content = await getContentBySlug("stoicism");
 *   // content.body  → raw markdown string
 *   // content.meta  → frontmatter fields
 */

// ── Types ─────────────────────────────────────────────────────

export interface TopicMeta {
  id: string;
  name: string;
  tagline: string;
  category: string;
  color?: string;
  resourceCount?: number;
  learnerCount?: number;
  tags?: string[];
  relatedTopics?: string[];
}

export interface TopicContent {
  slug: string;
  meta: TopicMeta;
  /** Raw markdown body (everything after the frontmatter block) */
  body: string;
}

// ── Vite glob import ──────────────────────────────────────────
// This loads ALL .md files at build time — no runtime fs access needed.
// Vite resolves `import.meta.glob` statically.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite provides import.meta.glob at runtime
const RAW_FILES: Record<string, string> = (import.meta as any).glob(
  "../content/topics/*.md",
  { eager: true, query: "?raw", import: "default" }
);

// ── Frontmatter parser (no external dep) ─────────────────────

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const fence = "---";
  if (!raw.trimStart().startsWith(fence)) return { meta: {}, body: raw };

  const start = raw.indexOf(fence) + fence.length;
  const end = raw.indexOf(fence, start);
  if (end === -1) return { meta: {}, body: raw };

  const yamlBlock = raw.slice(start, end).trim();
  const body = raw.slice(end + fence.length).trim();
  const meta: Record<string, unknown> = {};

  let currentKey = "";
  let inList = false;
  const listItems: string[] = [];

  for (const rawLine of yamlBlock.split("\n")) {
    const line = rawLine.trimEnd();

    // List item
    if (line.match(/^  - /)) {
      listItems.push(line.replace(/^  - /, "").trim());
      continue;
    }

    // Flush previous list
    if (inList && currentKey && !line.match(/^  - /)) {
      meta[currentKey] = [...listItems];
      listItems.length = 0;
      inList = false;
    }

    // Key-value
    const kv = line.match(/^(\w[\w-]*): *(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    currentKey = key;

    if (value === "") {
      inList = true;
    } else {
      // Auto-cast numbers
      const num = Number(value);
      if (!isNaN(num) && value !== "") {
        meta[key] = num;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        meta[key] = value.slice(1, -1);
      } else {
        meta[key] = value;
      }
    }
  }

  // Flush trailing list
  if (inList && currentKey) meta[currentKey] = [...listItems];

  return { meta, body };
}

// ── Build content map ─────────────────────────────────────────

function buildContentMap(): Map<string, TopicContent> {
  const map = new Map<string, TopicContent>();

  for (const [path, raw] of Object.entries(RAW_FILES) as [string, string][]) {
    // Derive slug from filename: "../content/topics/stoicism.md" → "stoicism"
    const filename = path.split("/").pop() ?? "";
    if (filename.startsWith("_")) continue; // skip _template.md etc.
    const slug = filename.replace(/\.md$/, "");

    const { meta, body } = parseFrontmatter(raw);

    map.set(slug, {
      slug,
      meta: {
        id: String(meta.id ?? slug),
        name: String(meta.name ?? slug),
        tagline: String(meta.tagline ?? ""),
        category: String(meta.category ?? ""),
        color: meta.color ? String(meta.color) : undefined,
        resourceCount: typeof meta.resourceCount === "number" ? meta.resourceCount : undefined,
        learnerCount: typeof meta.learnerCount === "number" ? meta.learnerCount : undefined,
        tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : undefined,
        relatedTopics: Array.isArray(meta.relatedTopics)
          ? (meta.relatedTopics as string[])
          : undefined,
      },
      body,
    });
  }

  return map;
}

const CONTENT_MAP = buildContentMap();

// ── Public API ────────────────────────────────────────────────

/** Returns the full content (meta + markdown body) for a single slug. */
export function getContentBySlug(slug: string): TopicContent | undefined {
  return CONTENT_MAP.get(slug);
}

/** Returns all content entries that have a .md file. */
export function getAllContent(): TopicContent[] {
  return Array.from(CONTENT_MAP.values());
}

/** Returns just the slugs that have .md content files. */
export function getContentSlugs(): string[] {
  return Array.from(CONTENT_MAP.keys());
}
