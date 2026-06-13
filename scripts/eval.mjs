// Runs the eval against a running dev server.
//   npm run eval            # offline retrieval-grounding (no key)
//   npm run eval -- --live  # full pipeline + LLM judge (needs a provider key)
// Override the target with EVAL_BASE_URL.

const base = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const live = process.argv.includes("--live") || process.env.EVAL_MODE === "live";
const url = `${base}/api/eval${live ? "?mode=live" : ""}`;

try {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`Eval endpoint returned ${res.status}${body.error ? ` — ${body.error}` : ""}.`);
    process.exit(2);
  }
  const report = await res.json();

  console.log(`\n${live ? "Live answer-quality" : "Retrieval grounding"} eval — ${base}`);
  console.log("─".repeat(60));
  for (const r of report.results) {
    const pct = Math.round((r.score ?? 0) * 100);
    const mark = r.skipped ? "•" : r.score >= report.threshold ? "✓" : "✗";
    let line = `${mark} [${String(pct).padStart(3)}%] ${r.slug}: ${r.question}`;
    if (live && r.verdict) line += `\n        ${r.verdict}`;
    else if (r.missing?.length) line += `  (missing: ${r.missing.join(", ")})`;
    console.log(line);
  }
  console.log("─".repeat(60));
  console.log(
    `passed ${report.passed}/${report.evaluated ?? report.total} · ` +
      `passRate ${(report.passRate * 100).toFixed(1)}% · threshold ${(report.threshold * 100).toFixed(0)}%\n`
  );

  process.exit(report.ok ? 0 : 1);
} catch (err) {
  console.error(`Could not reach ${url} — start the dev server first.`);
  console.error(String(err));
  process.exit(2);
}
