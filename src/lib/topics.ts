// ── Types ──────────────────────────────────────────────────

export interface Resource {
  id: string;
  title: string;
  author?: string;
  type: "book" | "article" | "video" | "course" | "paper";
  url?: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface TopicNode {
  id: string;
  label: string;
  weight?: number; // relative importance / size in graph
}

export interface TopicEdge {
  source: string;
  target: string;
  strength?: number;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  resourceCount: number;
  learnerCount: number;
  category: string;
  tags: string[];
  color?: string; // accent color hex
  resources: Resource[];
  relatedNodes: TopicNode[];
  edges: TopicEdge[];
}

// ── Mock Data ──────────────────────────────────────────────

export const ALL_TOPICS: Topic[] = [
  {
    id: "stoicism",
    slug: "stoicism",
    name: "Stoicism",
    tagline: "Live according to nature and reason",
    description:
      "Stoicism is a school of Hellenistic philosophy founded by Zeno of Citium. It teaches the development of self-control and fortitude as a means of overcoming destructive emotions. Stoics believed that becoming a clear and unbiased thinker allows one to understand the universal reason (logos).",
    resourceCount: 48,
    learnerCount: 12400,
    category: "Ancient Philosophy",
    tags: ["virtue", "ethics", "mindfulness", "ancient greece"],
    color: "#2DD4BF",
    resources: [
      {
        id: "med",
        title: "Meditations",
        author: "Marcus Aurelius",
        type: "book",
        description:
          "Personal writings of Roman Emperor Marcus Aurelius — a primary source of Stoic practice and reflection.",
        difficulty: "beginner",
      },
      {
        id: "disc",
        title: "Discourses",
        author: "Epictetus",
        type: "book",
        description:
          "Lectures by the slave-turned-philosopher Epictetus, recorded by his student Arrian.",
        difficulty: "intermediate",
      },
      {
        id: "letters",
        title: "Letters to Lucilius",
        author: "Seneca",
        type: "book",
        description:
          "124 letters covering practical Stoic ethics, virtue, and the examined life.",
        difficulty: "beginner",
      },
      {
        id: "stoic-guide",
        title: "A Guide to the Good Life",
        author: "William B. Irvine",
        type: "book",
        description:
          "A modern guide to practicing Stoic philosophy in contemporary life.",
        difficulty: "beginner",
      },
      {
        id: "enchiridion",
        title: "Enchiridion",
        author: "Epictetus",
        type: "book",
        description:
          "A short manual of Stoic ethical advice compiled from the Discourses.",
        difficulty: "beginner",
      },
    ],
    relatedNodes: [
      { id: "stoicism", label: "Stoicism", weight: 3 },
      { id: "ethics", label: "Ethics", weight: 2 },
      { id: "virtue-ethics", label: "Virtue Ethics", weight: 2 },
      { id: "marcus-aurelius", label: "Marcus Aurelius", weight: 1.5 },
      { id: "epictetus", label: "Epictetus", weight: 1.5 },
      { id: "seneca", label: "Seneca", weight: 1.5 },
      { id: "mindfulness", label: "Mindfulness", weight: 1 },
      { id: "resilience", label: "Resilience", weight: 1 },
      { id: "hellenistic", label: "Hellenistic Phil.", weight: 1 },
      { id: "logos", label: "Logos", weight: 1 },
    ],
    edges: [
      { source: "stoicism", target: "ethics" },
      { source: "stoicism", target: "virtue-ethics" },
      { source: "stoicism", target: "marcus-aurelius" },
      { source: "stoicism", target: "epictetus" },
      { source: "stoicism", target: "seneca" },
      { source: "stoicism", target: "mindfulness" },
      { source: "stoicism", target: "resilience" },
      { source: "stoicism", target: "hellenistic" },
      { source: "stoicism", target: "logos" },
      { source: "virtue-ethics", target: "ethics" },
      { source: "marcus-aurelius", target: "epictetus" },
    ],
  },
  {
    id: "epistemology",
    slug: "epistemology",
    name: "Epistemology",
    tagline: "What does it mean to know something?",
    description:
      "Epistemology is the branch of philosophy concerned with knowledge — its nature, sources, scope, and limits. Central questions include: What is knowledge? How is it acquired? What do people know? Is knowledge possible?",
    resourceCount: 62,
    learnerCount: 8750,
    category: "Core Philosophy",
    tags: ["knowledge", "belief", "justification", "skepticism"],
    color: "#8B5CF6",
    resources: [
      {
        id: "theaetetus",
        title: "Theaetetus",
        author: "Plato",
        type: "book",
        description:
          "Plato's dialogue exploring the nature of knowledge through Socratic inquiry.",
        difficulty: "intermediate",
      },
      {
        id: "meditations-descartes",
        title: "Meditations on First Philosophy",
        author: "René Descartes",
        type: "book",
        description:
          "Descartes' radical skepticism and the search for certain foundations of knowledge.",
        difficulty: "intermediate",
      },
      {
        id: "essay-locke",
        title: "An Essay Concerning Human Understanding",
        author: "John Locke",
        type: "book",
        description:
          "Locke's empiricist theory of knowledge derived from sensory experience.",
        difficulty: "advanced",
      },
    ],
    relatedNodes: [
      { id: "epistemology", label: "Epistemology", weight: 3 },
      { id: "skepticism", label: "Skepticism", weight: 2 },
      { id: "rationalism", label: "Rationalism", weight: 2 },
      { id: "empiricism", label: "Empiricism", weight: 2 },
      { id: "logic", label: "Logic", weight: 1.5 },
      { id: "metaphysics", label: "Metaphysics", weight: 1.5 },
      { id: "descartes", label: "Descartes", weight: 1 },
      { id: "locke", label: "Locke", weight: 1 },
      { id: "hume", label: "Hume", weight: 1 },
    ],
    edges: [
      { source: "epistemology", target: "skepticism" },
      { source: "epistemology", target: "rationalism" },
      { source: "epistemology", target: "empiricism" },
      { source: "epistemology", target: "logic" },
      { source: "epistemology", target: "metaphysics" },
      { source: "epistemology", target: "descartes" },
      { source: "epistemology", target: "locke" },
      { source: "epistemology", target: "hume" },
      { source: "rationalism", target: "descartes" },
      { source: "empiricism", target: "locke" },
      { source: "empiricism", target: "hume" },
    ],
  },
  {
    id: "ethics",
    slug: "ethics",
    name: "Ethics",
    tagline: "How should we live and treat one another?",
    description:
      "Ethics is the branch of philosophy that involves systematizing, defending, and recommending concepts of right and wrong conduct. Major approaches include consequentialism, deontology, and virtue ethics.",
    resourceCount: 95,
    learnerCount: 21000,
    category: "Core Philosophy",
    tags: ["morality", "virtue", "consequentialism", "deontology"],
    color: "#F59E0B",
    resources: [
      {
        id: "nicomachean",
        title: "Nicomachean Ethics",
        author: "Aristotle",
        type: "book",
        description:
          "Aristotle's seminal work on virtue ethics and the nature of eudaimonia (flourishing).",
        difficulty: "intermediate",
      },
      {
        id: "groundwork",
        title: "Groundwork for the Metaphysics of Morals",
        author: "Immanuel Kant",
        type: "book",
        description:
          "Kant's foundation for deontological ethics and the categorical imperative.",
        difficulty: "advanced",
      },
      {
        id: "utilitarianism",
        title: "Utilitarianism",
        author: "John Stuart Mill",
        type: "book",
        description:
          "Mill's defense and refinement of utilitarian ethics — the greatest happiness principle.",
        difficulty: "beginner",
      },
    ],
    relatedNodes: [
      { id: "ethics", label: "Ethics", weight: 3 },
      { id: "virtue-ethics", label: "Virtue Ethics", weight: 2 },
      { id: "deontology", label: "Deontology", weight: 2 },
      { id: "consequentialism", label: "Consequentialism", weight: 2 },
      { id: "aristotle", label: "Aristotle", weight: 1.5 },
      { id: "kant", label: "Kant", weight: 1.5 },
      { id: "mill", label: "J.S. Mill", weight: 1.5 },
      { id: "metaethics", label: "Metaethics", weight: 1 },
      { id: "applied-ethics", label: "Applied Ethics", weight: 1 },
    ],
    edges: [
      { source: "ethics", target: "virtue-ethics" },
      { source: "ethics", target: "deontology" },
      { source: "ethics", target: "consequentialism" },
      { source: "ethics", target: "aristotle" },
      { source: "ethics", target: "kant" },
      { source: "ethics", target: "mill" },
      { source: "ethics", target: "metaethics" },
      { source: "ethics", target: "applied-ethics" },
      { source: "virtue-ethics", target: "aristotle" },
      { source: "deontology", target: "kant" },
      { source: "consequentialism", target: "mill" },
    ],
  },
  {
    id: "existentialism",
    slug: "existentialism",
    name: "Existentialism",
    tagline: "Existence precedes essence",
    description:
      "Existentialism is a philosophical movement that emphasizes individual freedom, choice, and responsibility. It holds that humans define their own meaning in life, and try to make rational decisions despite existing in an irrational universe.",
    resourceCount: 57,
    learnerCount: 16800,
    category: "Modern Philosophy",
    tags: ["freedom", "authenticity", "absurdism", "consciousness"],
    color: "#EC4899",
    resources: [
      {
        id: "being-nothingness",
        title: "Being and Nothingness",
        author: "Jean-Paul Sartre",
        type: "book",
        description:
          "Sartre's magnum opus on human consciousness, freedom, and bad faith.",
        difficulty: "advanced",
      },
      {
        id: "myth-sisyphus",
        title: "The Myth of Sisyphus",
        author: "Albert Camus",
        type: "book",
        description:
          "Camus' essay on the absurd and the philosophical question of whether life is worth living.",
        difficulty: "intermediate",
      },
      {
        id: "fear-trembling",
        title: "Fear and Trembling",
        author: "Søren Kierkegaard",
        type: "book",
        description:
          "Kierkegaard's exploration of faith, ethics, and the individual's relationship with God.",
        difficulty: "advanced",
      },
    ],
    relatedNodes: [
      { id: "existentialism", label: "Existentialism", weight: 3 },
      { id: "absurdism", label: "Absurdism", weight: 2 },
      { id: "phenomenology", label: "Phenomenology", weight: 2 },
      { id: "sartre", label: "Sartre", weight: 1.5 },
      { id: "camus", label: "Camus", weight: 1.5 },
      { id: "kierkegaard", label: "Kierkegaard", weight: 1.5 },
      { id: "heidegger", label: "Heidegger", weight: 1.5 },
      { id: "freedom", label: "Freedom", weight: 1 },
      { id: "authenticity", label: "Authenticity", weight: 1 },
    ],
    edges: [
      { source: "existentialism", target: "absurdism" },
      { source: "existentialism", target: "phenomenology" },
      { source: "existentialism", target: "sartre" },
      { source: "existentialism", target: "camus" },
      { source: "existentialism", target: "kierkegaard" },
      { source: "existentialism", target: "heidegger" },
      { source: "existentialism", target: "freedom" },
      { source: "existentialism", target: "authenticity" },
      { source: "absurdism", target: "camus" },
      { source: "phenomenology", target: "heidegger" },
    ],
  },
  {
    id: "logic",
    slug: "logic",
    name: "Logic",
    tagline: "The science of valid reasoning",
    description:
      "Logic is the study of correct reasoning. It encompasses formal logic (symbolic systems), informal logic (argument analysis), and mathematical logic. Central to philosophy, mathematics, computer science, and linguistics.",
    resourceCount: 74,
    learnerCount: 9200,
    category: "Core Philosophy",
    tags: ["reasoning", "argumentation", "formal systems", "proof"],
    color: "#3B82F6",
    resources: [
      {
        id: "organon",
        title: "Organon",
        author: "Aristotle",
        type: "book",
        description:
          "Aristotle's collection of works on logic — the foundation of Western logical tradition.",
        difficulty: "advanced",
      },
      {
        id: "intro-logic",
        title: "Introduction to Logic",
        author: "Irving M. Copi",
        type: "book",
        description:
          "A comprehensive textbook covering both formal and informal logic.",
        difficulty: "beginner",
      },
    ],
    relatedNodes: [
      { id: "logic", label: "Logic", weight: 3 },
      { id: "formal-logic", label: "Formal Logic", weight: 2 },
      { id: "informal-logic", label: "Informal Logic", weight: 2 },
      { id: "mathematics", label: "Mathematics", weight: 1.5 },
      { id: "epistemology", label: "Epistemology", weight: 1.5 },
      { id: "argumentation", label: "Argumentation", weight: 1 },
    ],
    edges: [
      { source: "logic", target: "formal-logic" },
      { source: "logic", target: "informal-logic" },
      { source: "logic", target: "mathematics" },
      { source: "logic", target: "epistemology" },
      { source: "logic", target: "argumentation" },
    ],
  },
  {
    id: "metaphysics",
    slug: "metaphysics",
    name: "Metaphysics",
    tagline: "What is the fundamental nature of reality?",
    description:
      "Metaphysics is the branch of philosophy that examines the fundamental nature of reality, including the relationship between mind and matter, substance and attribute, possibility and actuality.",
    resourceCount: 83,
    learnerCount: 7100,
    category: "Core Philosophy",
    tags: ["reality", "existence", "consciousness", "ontology"],
    color: "#6366F1",
    resources: [
      {
        id: "metaphysics-aristotle",
        title: "Metaphysics",
        author: "Aristotle",
        type: "book",
        description:
          "Aristotle's foundational investigation into the nature of being and reality.",
        difficulty: "advanced",
      },
    ],
    relatedNodes: [
      { id: "metaphysics", label: "Metaphysics", weight: 3 },
      { id: "ontology", label: "Ontology", weight: 2 },
      { id: "mind-body", label: "Mind-Body Problem", weight: 2 },
      { id: "phil-of-mind", label: "Phil. of Mind", weight: 1.5 },
      { id: "epistemology", label: "Epistemology", weight: 1.5 },
      { id: "causality", label: "Causality", weight: 1 },
      { id: "time", label: "Time & Space", weight: 1 },
    ],
    edges: [
      { source: "metaphysics", target: "ontology" },
      { source: "metaphysics", target: "mind-body" },
      { source: "metaphysics", target: "phil-of-mind" },
      { source: "metaphysics", target: "epistemology" },
      { source: "metaphysics", target: "causality" },
      { source: "metaphysics", target: "time" },
    ],
  },
  {
    id: "political-philosophy",
    slug: "political-philosophy",
    name: "Political Philosophy",
    tagline: "Justice, power, and the foundations of society",
    description:
      "Political philosophy examines questions about government, justice, rights, law, and the enforcement of a legal code. It engages with questions of legitimacy, authority, freedom, and equality.",
    resourceCount: 71,
    learnerCount: 13500,
    category: "Applied Philosophy",
    tags: ["justice", "democracy", "rights", "social contract"],
    color: "#10B981",
    resources: [
      {
        id: "republic",
        title: "The Republic",
        author: "Plato",
        type: "book",
        description:
          "Plato's vision of a just society, the nature of justice, and the ideal state.",
        difficulty: "intermediate",
      },
      {
        id: "leviathan",
        title: "Leviathan",
        author: "Thomas Hobbes",
        type: "book",
        description:
          "Hobbes' foundational work on the social contract and the origins of political authority.",
        difficulty: "intermediate",
      },
      {
        id: "theory-of-justice",
        title: "A Theory of Justice",
        author: "John Rawls",
        type: "book",
        description:
          "Rawls' influential theory of justice as fairness, introducing the veil of ignorance.",
        difficulty: "advanced",
      },
    ],
    relatedNodes: [
      { id: "political-philosophy", label: "Political Phil.", weight: 3 },
      { id: "social-contract", label: "Social Contract", weight: 2 },
      { id: "justice", label: "Justice", weight: 2 },
      { id: "rights", label: "Rights Theory", weight: 1.5 },
      { id: "democracy", label: "Democracy", weight: 1.5 },
      { id: "plato", label: "Plato", weight: 1 },
      { id: "hobbes", label: "Hobbes", weight: 1 },
      { id: "rawls", label: "Rawls", weight: 1 },
    ],
    edges: [
      { source: "political-philosophy", target: "social-contract" },
      { source: "political-philosophy", target: "justice" },
      { source: "political-philosophy", target: "rights" },
      { source: "political-philosophy", target: "democracy" },
      { source: "political-philosophy", target: "plato" },
      { source: "political-philosophy", target: "hobbes" },
      { source: "political-philosophy", target: "rawls" },
      { source: "social-contract", target: "hobbes" },
      { source: "justice", target: "rawls" },
    ],
  },
  {
    id: "philosophy-of-mind",
    slug: "philosophy-of-mind",
    name: "Philosophy of Mind",
    tagline: "The nature of consciousness and mental states",
    description:
      "Philosophy of mind studies the nature of the mind, mental events, mental functions, mental properties, consciousness, and their relationship to the physical body.",
    resourceCount: 59,
    learnerCount: 10200,
    category: "Core Philosophy",
    tags: ["consciousness", "qualia", "dualism", "functionalism"],
    color: "#F97316",
    resources: [
      {
        id: "what-is-it-like",
        title: "What Is It Like to Be a Bat?",
        author: "Thomas Nagel",
        type: "paper",
        description:
          "Nagel's classic paper on subjective experience and the limits of physicalism.",
        difficulty: "intermediate",
      },
    ],
    relatedNodes: [
      { id: "philosophy-of-mind", label: "Phil. of Mind", weight: 3 },
      { id: "consciousness", label: "Consciousness", weight: 2 },
      { id: "qualia", label: "Qualia", weight: 2 },
      { id: "dualism", label: "Dualism", weight: 1.5 },
      { id: "functionalism", label: "Functionalism", weight: 1.5 },
      { id: "neuroscience", label: "Neuroscience", weight: 1 },
      { id: "ai-mind", label: "AI & Mind", weight: 1 },
    ],
    edges: [
      { source: "philosophy-of-mind", target: "consciousness" },
      { source: "philosophy-of-mind", target: "qualia" },
      { source: "philosophy-of-mind", target: "dualism" },
      { source: "philosophy-of-mind", target: "functionalism" },
      { source: "philosophy-of-mind", target: "neuroscience" },
      { source: "philosophy-of-mind", target: "ai-mind" },
    ],
  },
];

// ── Category list ──────────────────────────────────────────

export const CATEGORIES = [
  "All",
  "Ancient Philosophy",
  "Core Philosophy",
  "Modern Philosophy",
  "Applied Philosophy",
];

// ── Featured topic slugs for landing page ─────────────────

export const FEATURED_SLUGS = [
  "stoicism",
  "ethics",
  "epistemology",
  "existentialism",
  "logic",
  "metaphysics",
  "political-philosophy",
  "philosophy-of-mind",
];

// ── Lookup helpers ─────────────────────────────────────────

export function getTopicBySlug(slug: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.slug === slug);
}

export function searchTopics(query: string): Topic[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ALL_TOPICS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.tagline.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q)
  );
}

export function getFeaturedTopics(): Topic[] {
  return FEATURED_SLUGS.map((s) => getTopicBySlug(s)!).filter(Boolean);
}

export const STAT_LINE = {
  topics: ALL_TOPICS.length,
  resources: ALL_TOPICS.reduce((acc, t) => acc + t.resourceCount, 0),
  learners: ALL_TOPICS.reduce((acc, t) => acc + t.learnerCount, 0),
};
