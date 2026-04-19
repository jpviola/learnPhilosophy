import matter from "gray-matter";

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

// @ts-ignore — Vite provides import.meta.glob at runtime
const RAW_FILES: Record<string, string> = (import.meta as any).glob(
  "../content/topics/*.md",
  { eager: true, query: "?raw", import: "default" }
);

// ── Slug normalizer ───────────────────────────────────────────

/** Converts any string to a URL-safe slug: "Agustín de Hipona" → "agustin-de-hipona" */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Build content map ─────────────────────────────────────────

function buildContentMap(): Map<string, TopicContent> {
  const map = new Map<string, TopicContent>();

  for (const [path, raw] of Object.entries(RAW_FILES) as [string, string][]) {
    const filename = path.split("/").pop() ?? "";
    if (filename.startsWith("_")) continue; // skip _template.md etc.
    const rawName = filename.replace(/\.md$/, "");

    const { data, content: body } = matter(raw);

    // Use frontmatter id as slug when available (already URL-safe); otherwise slugify filename
    const slug = data.id ? String(data.id) : toSlug(rawName);
    // Use frontmatter name when available; otherwise raw filename preserves the display name
    const displayName = data.name ? String(data.name) : rawName;

    map.set(slug, {
      slug,
      meta: {
        id: slug,
        name: displayName,
        tagline: String(data.tagline ?? ""),
        category: String(data.category ?? ""),
        color: data.color ? String(data.color) : undefined,
        resourceCount: typeof data.resourceCount === "number" ? data.resourceCount : undefined,
        learnerCount: typeof data.learnerCount === "number" ? data.learnerCount : undefined,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
        relatedTopics: Array.isArray(data.relatedTopics)
          ? (data.relatedTopics as string[])
          : undefined,
      },
      body: body.trim(),
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
