import { A } from "@solidjs/router";
import clsx from "clsx";
import { Topic } from "~/lib/topics";

interface TopicCardProps {
  topic: Topic;
  animationDelay?: number;
}

const resourceTypeIcons: Record<string, string> = {
  book: "📖",
  article: "📄",
  video: "▶",
  course: "🎓",
  paper: "📑",
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TopicCard(props: TopicCardProps) {
  const { topic } = props;

  return (
    <A
      href={`/topic/${topic.slug}`}
      class={clsx(
        "group block",
        "bg-brand-surface rounded-xl border border-brand-border",
        "p-5 transition-all duration-[220ms] ease-out",
        "shadow-card hover:shadow-card-hover hover:-translate-y-0.5",
        "hover:border-brand-primary/30",
        "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        "opacity-0 animate-fade-up",
      )}
      style={
        props.animationDelay !== undefined
          ? { "animation-delay": `${props.animationDelay}ms`, "animation-fill-mode": "forwards" }
          : {}
      }
    >
      {/* Color accent bar */}
      <div
        class="w-8 h-1 rounded-pill mb-4"
        style={{ background: topic.color ?? "#2DD4BF" }}
      />

      {/* Title + category */}
      <div class="mb-2">
        <h3 class="text-base font-semibold text-brand-text group-hover:text-teal-700 transition-colors duration-fast leading-snug">
          {topic.name}
        </h3>
        <p class="text-xs text-brand-muted mt-0.5 font-medium uppercase tracking-wide">
          {topic.category}
        </p>
      </div>

      {/* Tagline */}
      <p class="text-sm text-brand-muted leading-relaxed mb-4 line-clamp-2">
        {topic.tagline}
      </p>

      {/* Tags */}
      <div class="flex flex-wrap gap-1.5 mb-4">
        {topic.tags.slice(0, 3).map((tag) => (
          <span class="text-xs px-2 py-0.5 bg-brand-chip rounded-pill border border-brand-border text-brand-muted">
            {tag}
          </span>
        ))}
      </div>

      {/* Stats footer */}
      <div class="flex items-center justify-between pt-3 border-t border-brand-border/70">
        <span class="text-xs text-brand-muted">
          <span class="font-semibold text-brand-secondary">
            {topic.resourceCount}
          </span>{" "}
          resources
        </span>
        <span class="text-xs text-brand-muted">
          <span class="font-semibold text-brand-text">
            {formatCount(topic.learnerCount)}
          </span>{" "}
          learners
        </span>
      </div>
    </A>
  );
}
