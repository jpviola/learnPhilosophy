import {
  createSignal,
  createMemo,
  Show,
  For,
  onCleanup,
  onMount,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { searchTopics, ALL_TOPICS } from "~/lib/topics";

interface SearchBarProps {
  initialValue?: string;
  size?: "hero" | "compact";
  placeholder?: string;
  autofocus?: boolean;
}

export function SearchBar(props: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal(props.initialValue ?? "");
  const [focused, setFocused] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(-1);

  const results = createMemo(() => {
    const q = query().trim();
    if (q.length < 1) return [];
    return searchTopics(q).slice(0, 6);
  });

  const showSuggestions = () => focused() && results().length > 0;

  let inputRef: HTMLInputElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  // Close on outside click
  onMount(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef?.contains(e.target as Node)) {
        setFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  function handleSubmit(slug?: string) {
    const target = slug ?? results()[activeIndex()]?.slug ?? query().trim();
    if (!target) return;
    setFocused(false);
    if (slug || results()[activeIndex()]) {
      navigate(`/topic/${slug ?? results()[activeIndex()].slug}`);
    } else {
      // Fuzzy match on submit
      const match = ALL_TOPICS.find(
        (t) =>
          t.name.toLowerCase() === target.toLowerCase() ||
          t.slug === target.toLowerCase()
      );
      navigate(match ? `/topic/${match.slug}` : `/topic/${encodeURIComponent(target)}`);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showSuggestions()) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  const isHero = () => (props.size ?? "hero") === "hero";

  return (
    <div ref={containerRef} class="relative w-full">
      {/* Input row */}
      <div
        class={clsx(
          "flex items-center gap-2 w-full",
          "bg-brand-surface border rounded-xl sm:rounded-xl",
          "transition-all duration-[220ms] ease-out",
          "shadow-input",
          focused()
            ? "border-brand-primary shadow-input-focus"
            : "border-brand-border hover:border-brand-primary/40",
          isHero() ? "px-4 py-3 sm:px-5 sm:py-3.5" : "px-3 py-2.5"
        )}
      >
        {/* Search icon */}
        <svg
          aria-hidden="true"
          class={clsx(
            "flex-shrink-0 transition-colors duration-fast",
            focused() ? "text-brand-primary" : "text-brand-muted",
            isHero() ? "w-5 h-5" : "w-4 h-4"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" stroke-linecap="round" />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="search"
          aria-label={props.placeholder ?? "Search philosophy topics"}
          placeholder={props.placeholder ?? "Search any topic — Stoicism, Ethics, Logic…"}
          autofocus={props.autofocus}
          value={query()}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          class={clsx(
            "flex-1 min-w-0 bg-transparent outline-none",
            "text-brand-text placeholder:text-brand-muted",
            "transition-colors duration-fast",
            isHero() ? "text-base sm:text-lg" : "text-sm"
          )}
          role="combobox"
          aria-expanded={showSuggestions()}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          autocomplete="off"
          spellcheck={false}
        />

        {/* Clear button */}
        <Show when={query().length > 0}>
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setFocused(false);
              inputRef?.focus();
            }}
            class={clsx(
              "flex-shrink-0 p-1 rounded-full",
              "text-brand-muted hover:text-brand-text hover:bg-black/5",
              "transition-colors duration-fast",
              "focus-visible:ring-2 focus-visible:ring-brand-primary"
            )}
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4.707 3.293a1 1 0 0 0-1.414 1.414L6.586 8l-3.293 3.293a1 1 0 1 0 1.414 1.414L8 9.414l3.293 3.293a1 1 0 0 0 1.414-1.414L9.414 8l3.293-3.293a1 1 0 0 0-1.414-1.414L8 6.586 4.707 3.293z" />
            </svg>
          </button>
        </Show>

        {/* Inline search button for compact */}
        <Show when={!isHero()}>
          <button
            type="button"
            aria-label="Search"
            onClick={() => handleSubmit()}
            class={clsx(
              "flex-shrink-0 h-7 px-3 rounded-pill text-xs font-semibold",
              "bg-brand-primary text-white hover:bg-brand-primary-dark",
              "transition-colors duration-fast",
              "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1"
            )}
          >
            Go
          </button>
        </Show>
      </div>

      {/* Suggestions dropdown */}
      <Show when={showSuggestions()}>
        <div
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          class={clsx(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-brand-surface border border-brand-border rounded-xl",
            "shadow-card-hover overflow-hidden",
            "animate-scale-in"
          )}
        >
          <For each={results()}>
            {(topic, i) => (
              <button
                type="button"
                role="option"
                aria-selected={activeIndex() === i()}
                class={clsx(
                  "suggestion-item w-full flex items-center gap-3 px-4 py-3 text-left",
                  "transition-colors duration-fast",
                  "border-b border-brand-border/50 last:border-0",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary",
                  activeIndex() === i()
                    ? "bg-brand-primary/8 text-brand-text"
                    : "hover:bg-brand-chip text-brand-muted hover:text-brand-text"
                )}
                onClick={() => handleSubmit(topic.slug)}
                onMouseEnter={() => setActiveIndex(i())}
              >
                {/* Color dot */}
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: topic.color ?? "#2DD4BF" }}
                  aria-hidden="true"
                />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-medium text-brand-text leading-tight">
                    {topic.name}
                  </span>
                  <span class="block text-xs text-brand-muted mt-0.5 truncate">
                    {topic.tagline}
                  </span>
                </span>
                <span class="text-xs text-brand-muted flex-shrink-0">
                  {topic.resourceCount} resources
                </span>
              </button>
            )}
          </For>

          {/* All results hint */}
          <div class="px-4 py-2 bg-brand-chip/50 border-t border-brand-border/50">
            <span class="text-xs text-brand-muted">
              Press <kbd class="font-mono bg-brand-border/60 px-1 rounded text-brand-text">↵</kbd> to explore
            </span>
          </div>
        </div>
      </Show>
    </div>
  );
}
