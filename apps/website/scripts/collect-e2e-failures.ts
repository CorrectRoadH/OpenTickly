#!/usr/bin/env npx tsx
/**
 * Reads test-results/results.json (Playwright JSON reporter output)
 * and appends failures to e2e-failure-stats.json.
 *
 * Usage: npx tsx scripts/collect-e2e-failures.ts
 */
import fs from "node:fs";
import path from "node:path";

const APP_ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_PATH = path.join(APP_ROOT, "test-results/results.json");
const STATS_PATH = path.join(APP_ROOT, "e2e-failure-stats.json");

type FailureRecord = {
  count: number;
  lastError: string;
  lastFailed: string;
};

type Stats = Record<string, FailureRecord>;

function loadStats(): Stats {
  try {
    return JSON.parse(fs.readFileSync(STATS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function run() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.log("No results.json found. Run e2e tests first.");
    process.exit(0);
  }

  const report = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8"));
  const stats = loadStats();
  const now = new Date().toISOString();
  let added = 0;

  for (const suite of report.suites ?? []) {
    collectFromSuite(suite, [], stats, now, () => added++);
  }

  const sorted = Object.fromEntries(
    Object.entries(stats).sort(([, a], [, b]) => b.count - a.count),
  );
  fs.writeFileSync(STATS_PATH, JSON.stringify(sorted, null, 2) + "\n");
  console.log(
    `Collected ${added} failure(s). Total tracked: ${Object.keys(sorted).length} test(s).`,
  );

  // Print top flaky tests
  const top = Object.entries(sorted).slice(0, 10);
  if (top.length > 0) {
    console.log("\nTop flaky tests:");
    for (const [name, record] of top) {
      const r = record as FailureRecord;
      console.log(`  ${r.count}x  ${name}`);
    }
  }
}

function collectFromSuite(
  suite: any,
  titlePath: string[],
  stats: Stats,
  now: string,
  onAdd: () => void,
) {
  const currentPath = suite.title ? [...titlePath, suite.title] : titlePath;

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const failed = test.results?.some(
        (r: any) => r.status === "failed" || r.status === "timedOut",
      );
      if (!failed) continue;

      const key = [...currentPath, spec.title].join(" › ");
      const lastResult = test.results?.findLast(
        (r: any) => r.status === "failed" || r.status === "timedOut",
      );
      const errorMessage = lastResult?.errors?.[0]?.message?.split("\n")[0] ?? "unknown";

      const existing = stats[key];
      stats[key] = {
        count: (existing?.count ?? 0) + 1,
        lastError: errorMessage,
        lastFailed: now,
      };
      onAdd();
    }
  }

  for (const child of suite.suites ?? []) {
    collectFromSuite(child, currentPath, stats, now, onAdd);
  }
}

run();
