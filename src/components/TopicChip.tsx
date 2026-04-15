import { JSX } from "solid-js";
import { A } from "@solidjs/router";
import clsx from "clsx";

interface TopicChipProps {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  class?: string;
  count?: number;
}

export function TopicChip(props: TopicChipProps) {
  const baseClass = clsx(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill",
    "text-sm font-medium",
    "border transition-all duration-[150ms] ease-out",
    "cursor-pointer select-none whitespace-nowrap",
    "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
    props.active
      ? "bg-brand-primary/10 border-brand-primary/30 text-teal-700"
      : "bg-brand-chip border-brand-border text-brand-muted hover:bg-brand-chip-hover hover:border-brand-primary/30 hover:text-brand-text",
    props.class
  );

  const inner = (
    <>
      {props.label}
      {props.count !== undefined && (
        <span
          class={clsx(
            "text-xs font-semibold px-1 rounded",
            props.active
              ? "text-teal-600"
              : "text-brand-secondary/80"
          )}
        >
          {props.count}
        </span>
      )}
    </>
  );

  if (props.href) {
    return (
      <A href={props.href} class={baseClass}>
        {inner}
      </A>
    );
  }

  return (
    <button type="button" class={baseClass} onClick={props.onClick}>
      {inner}
    </button>
  );
}

// ── Chip list row ─────────────────────────────────────────

interface ChipRowProps {
  children: JSX.Element;
  class?: string;
}

export function ChipRow(props: ChipRowProps) {
  return (
    <div
      class={clsx(
        "flex flex-wrap gap-2",
        props.class
      )}
    >
      {props.children}
    </div>
  );
}
