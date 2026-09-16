---
name: benchmarking
description: Focused workflow for benchmarking.
---

# benchmarking

## When to use

Use when claiming a **performance improvement, regression, or SLA compliance** — numbers require a reproducible baseline first.

## Procedure

1. Define the metric (p50/p95 latency, throughput, memory RSS, query count) and the user-visible scenario it proxies.
2. Fix the corpus and environment: dataset size, hardware profile, concurrency level, warm-up policy, and feature flags.
3. Capture baseline on the parent commit or `main`: `git stash` if needed, checkout baseline SHA, run the benchmark command **three times**, record median.
4. Return to the candidate commit; run the **identical command** three times on the same corpus — record median and variance.
5. Set pass/fail threshold before comparing (e.g., "p95 must improve ≥10% or not regress >5%") — post-hoc thresholds are invalid.
6. Save raw numbers and exact command lines; attach proof: `node scripts/engineering-os.mjs record-evidence --target . --command "..." --exit-code 0 --summary "baseline p95=120ms candidate p95=95ms (-21%)" --owner "..."`.
7. If claiming optimization, cite changed `path:line` locations explaining the mechanism — correlation without causation is insufficient.

## Exit criteria

- Corpus, metric, threshold, and reproducible command documented — another engineer can rerun without chat context.
- Baseline and candidate medians recorded from the same environment and dataset.
- Performance claim matches the predeclared threshold rules.
- No benchmark runs on uncommitted dirty state without noting confounders.
