// Runs the offline retrieval-grounding eval against a running dev server.
// Usage: npm run dev (in one terminal), then `npm run eval`.
// Override the target with EVAL_BASE_URL.

const base = process.env.EVAL_BASE_URL ?? "http://localhost:3000";

try {
  const res = await fetch(`${base}/api/eval`);
  if (!res.ok) {
    console.error(`Eval endpoint returned ${res.status}. Is the dev server running?`);
    process.exit(2);
  }
  const report = await res.json();

  console.log(`\nRetrieval grounding eval — ${base}`);
  console.log("─".repeat(56));
  for (const r of report.results) {
    const pct = Math.round(r.score * 100);
    const mark = r.skipped ? "•" : r.score >= report.threshold ? "✓" : "✗";
    console.log(
      `${mark} [${pct.toString().padStart(3)}%] ${r.slug}: ${r.question}` +
        (r.missing.length ? `  (missing: ${r.missing.join(", ")})` : "")
    );
  }
  console.log("─".repeat(56));
  console.log(
    `passed ${report.passed}/${report.evaluated} · passRate ${(
      report.passRate * 100
    ).toFixed(1)}% · threshold ${(report.threshold * 100).toFixed(0)}%\n`
  );

  process.exit(report.ok ? 0 : 1);
} catch (err) {
  console.error(`Could not reach ${base}/api/eval — start the dev server first.`);
  console.error(String(err));
  process.exit(2);
}
