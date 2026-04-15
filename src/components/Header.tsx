import { createSignal, onCleanup, onMount } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import clsx from "clsx";

export function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = createSignal(false);

  onMount(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", handler));
  });

  const isHome = () => location.pathname === "/";

  return (
    <header
      class={clsx(
        "fixed top-0 left-0 right-0 z-50",
        "transition-all duration-[220ms] ease-out",
        isHome()
          ? /* dark/transparent on landing */ clsx(
              "bg-transparent",
              scrolled() && "bg-neutral-950/80 backdrop-blur-sm"
            )
          : /* light on inner pages */ clsx(
              "bg-brand-bg/90 backdrop-blur-sm border-b border-brand-border",
              scrolled() && "shadow-sm"
            )
      )}
    >
      <div class="w-full mx-auto px-5 sm:px-8 max-w-7xl">
        <div class="flex items-center justify-between h-14">
          {/* Wordmark */}
          <A
            href="/"
            class={clsx(
              "flex items-center gap-2 group rounded-md",
              "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              isHome() && "focus-visible:ring-offset-neutral-950"
            )}
            aria-label="LearnPhilosophy home"
          >
            <div
              class="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
              aria-hidden="true"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
                <path d="M8 2C4.69 2 2 4.69 2 8" stroke="white" stroke-width="1.8" stroke-linecap="round" />
                <path d="M14 8C14 11.31 11.31 14 8 14" stroke="white" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </div>
            <span
              class={clsx(
                "text-sm font-semibold tracking-tight",
                isHome() ? "text-white/80 group-hover:text-white" : "text-brand-text"
              )}
            >
              learn<span class={isHome() ? "text-emerald-400" : "text-emerald-600"}>philosophy</span>
            </span>
          </A>

          {/* Right nav */}
          <nav class="flex items-center gap-3" aria-label="Primary navigation">
            {!isHome() && (
              <A
                href="/"
                class="text-sm text-brand-muted hover:text-brand-text transition-colors duration-150 hidden sm:block"
              >
                ← Explore
              </A>
            )}

            <a
              href={isHome() ? "#" : "#resources"}
              class={clsx(
                "text-sm transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-emerald-500 rounded",
                isHome()
                  ? "text-white/50 hover:text-emerald-400"
                  : "text-brand-muted hover:text-brand-text"
              )}
            >
              Sign in
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
