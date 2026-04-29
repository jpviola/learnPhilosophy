import type { Resource, Topic } from "~/lib/topics";

export type OntologyEntityKind =
  | "Topic"
  | "Concept"
  | "Philosopher"
  | "Work"
  | "School"
  | "Problem"
  | "Argument"
  | "Period"
  | "Resource"
  | "LearningLevel";

export type OntologyRelationType =
  | "TOPIC_IN_CATEGORY"
  | "TOPIC_HAS_TAG"
  | "TOPIC_RELATED_TO"
  | "TOPIC_HAS_RESOURCE"
  | "RESOURCE_WRITTEN_BY"
  | "RESOURCE_HAS_DIFFICULTY"
  | "CONCEPT_RELATED_TO";

export interface OntologyEntity {
  id: string;
  kind: OntologyEntityKind;
  label: string;
  aliases?: string[];
  properties?: Record<string, string | number | boolean | string[]>;
  source: {
    kind: "seed" | "content" | "derived";
    ref: string;
  };
}

export interface OntologyRelation {
  source: string;
  type: OntologyRelationType;
  target: string;
  confidence: number;
  provenance: {
    source: "topic" | "resource" | "tag" | "graph";
    ref: string;
  };
}

export interface OntologyRule {
  id: string;
  description: string;
}

export interface OntologyGraph {
  schemaVersion: "philosophy-education/v1";
  generatedAt: string;
  rootTopicId: string;
  entities: OntologyEntity[];
  relations: OntologyRelation[];
  rules: OntologyRule[];
}

export interface OntologyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const PHILOSOPHER_HINTS = [
  "aristotle",
  "plato",
  "kant",
  "marcus-aurelius",
  "epictetus",
  "seneca",
  "descartes",
  "locke",
  "hume",
  "sartre",
  "camus",
  "kierkegaard",
  "heidegger",
  "hobbes",
  "rawls",
  "mill",
  "aquinas",
  "tomás-de-aquino",
  "santo-tomás-de-aquino",
  "agustín-de-hipona",
];

const SCHOOL_HINTS = [
  "stoicism",
  "existentialism",
  "phenomenology",
  "skepticism",
  "rationalism",
  "empiricism",
  "neoplatonism",
  "monoteísmo",
];

const PROBLEM_HINTS = [
  "mind-body",
  "consciousness",
  "qualia",
  "causality",
  "time",
  "justice",
  "knowledge",
  "universales",
];

export const PHILOSOPHY_ONTOLOGY_RULES: OntologyRule[] = [
  {
    id: "traceability-required",
    description:
      "Every entity and relation must keep a source reference so answers can point back to topic metadata, content, resources, or graph edges.",
  },
  {
    id: "typed-relations-only",
    description:
      "Relations must use the ontology relation vocabulary; do not create free-form relation labels in application data.",
  },
  {
    id: "resource-difficulty-required",
    description:
      "Every learning resource must carry a beginner, intermediate, or advanced difficulty level.",
  },
  {
    id: "conceptual-redirect",
    description:
      "Questions outside the root topic should be redirected through related concepts instead of answered as unrelated trivia.",
  },
];

const ALLOWED_RELATIONS: Record<OntologyRelationType, readonly OntologyEntityKind[]> = {
  TOPIC_IN_CATEGORY: ["Concept"],
  TOPIC_HAS_TAG: ["Concept"],
  TOPIC_RELATED_TO: [
    "Topic",
    "Concept",
    "Philosopher",
    "Work",
    "School",
    "Problem",
    "Argument",
    "Period",
  ],
  TOPIC_HAS_RESOURCE: ["Resource"],
  RESOURCE_WRITTEN_BY: ["Philosopher"],
  RESOURCE_HAS_DIFFICULTY: ["LearningLevel"],
  CONCEPT_RELATED_TO: ["Concept", "Problem", "School", "Argument"],
};

function toEntityId(kind: OntologyEntityKind, value: string): string {
  return `${kind.toLowerCase()}:${value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function labelFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function classifyRelatedNode(nodeId: string): OntologyEntityKind {
  if (PHILOSOPHER_HINTS.includes(nodeId)) return "Philosopher";
  if (SCHOOL_HINTS.includes(nodeId)) return "School";
  if (PROBLEM_HINTS.includes(nodeId)) return "Problem";
  if (nodeId.includes("ethics") || nodeId.includes("logic")) return "Concept";
  if (nodeId.includes("argument")) return "Argument";
  return "Concept";
}

function upsertEntity(map: Map<string, OntologyEntity>, entity: OntologyEntity) {
  const existing = map.get(entity.id);
  if (!existing) {
    map.set(entity.id, entity);
    return;
  }

  map.set(entity.id, {
    ...existing,
    aliases: Array.from(
      new Set([...(existing.aliases ?? []), ...(entity.aliases ?? [])])
    ),
    properties: { ...existing.properties, ...entity.properties },
  });
}

function resourceEntity(resource: Resource): OntologyEntity {
  return {
    id: toEntityId("Resource", resource.id || resource.title),
    kind: "Resource",
    label: resource.title,
    properties: {
      type: resource.type,
      difficulty: resource.difficulty,
      description: resource.description,
    },
    source: { kind: "seed", ref: `resource:${resource.id}` },
  };
}

export function buildOntologyGraph(topic: Topic): OntologyGraph {
  const entities = new Map<string, OntologyEntity>();
  const relations: OntologyRelation[] = [];
  const topicId = toEntityId("Topic", topic.slug);

  upsertEntity(entities, {
    id: topicId,
    kind: "Topic",
    label: topic.name,
    aliases: [topic.slug, topic.id],
    properties: {
      category: topic.category,
      tags: topic.tags,
      resourceCount: topic.resourceCount,
      learnerCount: topic.learnerCount,
      isPrimary: Boolean(topic.isPrimary),
    },
    source: {
      kind: topic.isPrimary ? "seed" : "content",
      ref: `topic:${topic.slug}`,
    },
  });

  const categoryId = toEntityId("Concept", topic.category || "Philosophy");
  upsertEntity(entities, {
    id: categoryId,
    kind: "Concept",
    label: topic.category || "Philosophy",
    source: { kind: "derived", ref: `topic:${topic.slug}:category` },
  });
  relations.push({
    source: topicId,
    type: "TOPIC_IN_CATEGORY",
    target: categoryId,
    confidence: 1,
    provenance: { source: "topic", ref: topic.slug },
  });

  for (const tag of topic.tags) {
    const tagId = toEntityId("Concept", tag);
    upsertEntity(entities, {
      id: tagId,
      kind: "Concept",
      label: tag,
      source: { kind: "derived", ref: `topic:${topic.slug}:tag:${tag}` },
    });
    relations.push({
      source: topicId,
      type: "TOPIC_HAS_TAG",
      target: tagId,
      confidence: 0.95,
      provenance: { source: "tag", ref: tag },
    });
  }

  for (const node of topic.relatedNodes) {
    if (node.id === topic.id || node.id === topic.slug) continue;
    const kind = classifyRelatedNode(node.id);
    const nodeEntityId = toEntityId(kind, node.id);
    upsertEntity(entities, {
      id: nodeEntityId,
      kind,
      label: node.label || labelFromSlug(node.id),
      aliases: [node.id],
      properties: { graphWeight: node.weight ?? 1 },
      source: { kind: "derived", ref: `graph-node:${node.id}` },
    });
    relations.push({
      source: topicId,
      type: "TOPIC_RELATED_TO",
      target: nodeEntityId,
      confidence: Math.min(1, 0.65 + (node.weight ?? 1) / 10),
      provenance: { source: "graph", ref: `${topic.slug}->${node.id}` },
    });
  }

  for (const resource of topic.resources) {
    const resourceNode = resourceEntity(resource);
    upsertEntity(entities, resourceNode);
    relations.push({
      source: topicId,
      type: "TOPIC_HAS_RESOURCE",
      target: resourceNode.id,
      confidence: 1,
      provenance: { source: "resource", ref: resource.id },
    });

    if (resource.author) {
      const authorId = toEntityId("Philosopher", resource.author);
      upsertEntity(entities, {
        id: authorId,
        kind: "Philosopher",
        label: resource.author,
        source: { kind: "derived", ref: `resource:${resource.id}:author` },
      });
      relations.push({
        source: resourceNode.id,
        type: "RESOURCE_WRITTEN_BY",
        target: authorId,
        confidence: 1,
        provenance: { source: "resource", ref: resource.id },
      });
    }

    const difficultyId = toEntityId("LearningLevel", resource.difficulty);
    upsertEntity(entities, {
      id: difficultyId,
      kind: "LearningLevel",
      label: resource.difficulty,
      source: { kind: "derived", ref: `resource:${resource.id}:difficulty` },
    });
    relations.push({
      source: resourceNode.id,
      type: "RESOURCE_HAS_DIFFICULTY",
      target: difficultyId,
      confidence: 1,
      provenance: { source: "resource", ref: resource.id },
    });
  }

  return {
    schemaVersion: "philosophy-education/v1",
    generatedAt: new Date().toISOString(),
    rootTopicId: topicId,
    entities: Array.from(entities.values()),
    relations,
    rules: PHILOSOPHY_ONTOLOGY_RULES,
  };
}

export function validateOntologyGraph(graph: OntologyGraph): OntologyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entities = new Map(graph.entities.map((entity) => [entity.id, entity]));

  if (!entities.has(graph.rootTopicId)) {
    errors.push(`Root topic entity is missing: ${graph.rootTopicId}`);
  }

  for (const entity of graph.entities) {
    if (!entity.id) errors.push(`Entity without id: ${entity.label}`);
    if (!entity.label) errors.push(`Entity without label: ${entity.id}`);
    if (!entity.source?.ref) {
      errors.push(`Entity without provenance: ${entity.id}`);
    }
    if (entity.kind === "Resource" && !entity.properties?.difficulty) {
      warnings.push(`Resource without difficulty: ${entity.label}`);
    }
  }

  for (const relation of graph.relations) {
    const source = entities.get(relation.source);
    const target = entities.get(relation.target);

    if (!source) errors.push(`Relation source is missing: ${relation.source}`);
    if (!target) errors.push(`Relation target is missing: ${relation.target}`);
    if (!relation.provenance?.ref) {
      errors.push(
        `Relation without provenance: ${relation.source} ${relation.type} ${relation.target}`
      );
    }

    if (source && target) {
      const allowedTargets = ALLOWED_RELATIONS[relation.type];
      if (!allowedTargets.includes(target.kind)) {
        errors.push(
          `${relation.type} cannot point from ${source.kind} to ${target.kind}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildOntologyPromptContext(topic: Topic): string {
  const graph = buildOntologyGraph(topic);
  const validation = validateOntologyGraph(graph);
  const entities = graph.entities
    .slice(0, 32)
    .map((entity) => `${entity.kind}:${entity.label}`)
    .join(", ");
  const relations = graph.relations
    .slice(0, 36)
    .map((relation) => {
      const source = graph.entities.find((entity) => entity.id === relation.source);
      const target = graph.entities.find((entity) => entity.id === relation.target);
      return `${source?.label ?? relation.source} ${relation.type} ${
        target?.label ?? relation.target
      }`;
    })
    .join("\n");

  return [
    `ONTOLOGY ${graph.schemaVersion}`,
    `Root topic: ${topic.name}`,
    `Validation: ${validation.valid ? "valid" : "invalid"}`,
    validation.errors.length ? `Validation errors: ${validation.errors.join("; ")}` : "",
    `Entity vocabulary: ${entities}`,
    `Relations:\n${relations}`,
    `Rules:\n${graph.rules.map((rule) => `- ${rule.description}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
