# Code style

- **Language:** TypeScript everywhere. No `any` unless interfacing with untyped
  runtime APIs (e.g. `import.meta.glob`), and isolate it behind a typed wrapper.
- **Components:** SolidJS. Use `createSignal`/`createMemo`/`createEffect`,
  `<Show>`/`<For>` — not `.map()` in JSX, not manual DOM. Access props lazily
  (`props.topic`), never destructure reactive props.
- **Styling:** Tailwind utility classes; use `clsx` for conditional classes.
  Reuse the `brand-*` design tokens (see `tailwind.config.js`) instead of raw hex.
- **Modularity:** Keep route handlers thin. Business logic goes in `src/lib/*`.
  One responsibility per file; prompts in `prompts/`, safety in `security/`.
- **Comments:** Only for constraints the code can't express (e.g. "process-local
  rate limit — needs shared store in serverless"). No narration of what the next
  line does.
- **Honesty:** No fabricated user-facing metrics. Derive counts from real data.
- **i18n:** User-facing strings should be localizable; the tutor answers in the
  user's locale. Don't hardcode language assumptions in prompts.
