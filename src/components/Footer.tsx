import { A } from "@solidjs/router";
import clsx from "clsx";
import { Container } from "./Container";

const links = {
  Learn: [
    { label: "All Topics", href: "/" },
    { label: "Philosophy", href: "/topic/ethics" },
    { label: "Logic", href: "/topic/logic" },
    { label: "Existentialism", href: "/topic/existentialism" },
  ],
  Explore: [
    { label: "Learning Paths", href: "/" },
    { label: "Resources", href: "/" },
    { label: "Knowledge Map", href: "/" },
  ],
  About: [
    { label: "About", href: "/" },
    { label: "Open Source", href: "/" },
    { label: "Contact", href: "/" },
  ],
};

export function Footer() {
  return (
    <footer class="border-t border-brand-border bg-brand-bg/60 mt-auto">
      <Container width="wide">
        <div class="py-12 sm:py-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand column */}
          <div class="col-span-2 sm:col-span-1">
            <A
              href="/"
              class="inline-flex items-center gap-2 mb-4 focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md"
            >
              <div class="w-6 h-6 rounded-md bg-brand-primary flex items-center justify-center" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" fill="white" />
                  <path d="M8 2C4.69 2 2 4.69 2 8" stroke="white" stroke-width="1.5" stroke-linecap="round" />
                  <path d="M14 8C14 11.31 11.31 14 8 14" stroke="white" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
              <span class="text-sm font-semibold text-brand-text">
                learn<span class="text-brand-primary">philosophy</span>
              </span>
            </A>
            <p class="text-sm text-brand-muted leading-relaxed max-w-[200px]">
              Explore ideas, discover thinkers, and build your own path through philosophy.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">
                {section}
              </h3>
              <ul class="space-y-2">
                {items.map((link) => (
                  <li>
                    <A
                      href={link.href}
                      class={clsx(
                        "text-sm text-brand-muted",
                        "hover:text-brand-text transition-colors duration-fast",
                        "focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                      )}
                    >
                      {link.label}
                    </A>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div class="border-t border-brand-border/60 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-brand-muted">
            &copy; {new Date().getFullYear()} LearnPhilosophy. Open source &amp; free to use.
          </p>
          <div class="flex items-center gap-4">
            <a
              href="/"
              class="text-xs text-brand-muted hover:text-brand-text transition-colors duration-fast"
            >
              Privacy
            </a>
            <a
              href="/"
              class="text-xs text-brand-muted hover:text-brand-text transition-colors duration-fast"
            >
              Terms
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              class="text-brand-muted hover:text-brand-text transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
