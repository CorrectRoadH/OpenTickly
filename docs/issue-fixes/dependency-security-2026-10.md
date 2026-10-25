# Dependency security maintenance (2026-10-25)

The workspace uses Vite+ 1.4.0 with its matching Vite alias and Vitest 5.0.5.
React and React DOM resolve together to 19.3.1. Compatible application packages
and Go modules were refreshed. Go's minimum version and Docker builder are
1.26.10, covering the standard-library advisories reported by govulncheck.

Security overrides retain fixed versions of DOMPurify, js-yaml, seroval,
compression, undici, brace-expansion, serialize-javascript and the CSS selector
parser. Typography pins parser 6.0.10 upstream; the 7.1.6 override was verified
through the website and documentation production builds. Remove overrides only
when the parent dependency resolves a safe version without them.

The landing image copies its production dependencies from the workspace deploy
output. A separate global `serve` install bypassed the workspace's compression
override. The deployed dependency tree resolves compression 1.8.2. This includes
the landing production libraries but excludes development dependencies.

The React plugin remains on 5.2.0: 6.x changes the React Compiler/Babel plugin
configuration and is not needed to clear the security audit. The existing pnpm
10.32.1 package manager remains pinned. This is not an OS/container CVE scan.

## Verification

- `vp pm audit --json`: 127 initial findings to zero (all severities).
- `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`: 32 initial reachable
  findings to zero; no imported-package vulnerabilities remain. GO-2026-5932
  concerns the unused, unmaintained `x/crypto/openpgp` package, with no fix listed.
- `vp test run`: 239 tests passed; Worker-specific tests: 21 passed.
- `vp run check`, `vp run -r build`, and frozen installation passed.
- Go tests passed with PostgreSQL on isolated port 55439. Three startup-environment
  tests ran separately without DATABASE_URL/REDIS_URL because they exercise env
  precedence and deliberately missing configuration; all assertions were retained.
- Real Chrome: 27 app-shell, timer and settings/profile E2E tests passed.
- `llms.txt` regression reproduced `[object Promise]`; the loader now awaits its
  index. The built endpoint contained 14 documentation links and no Promise literal.
- `harness-lint check --changed`: no diagnostics. Four non-blocking lint warnings
  remain: the landing not-found route's unused argument and three CalendarView
  void-operator warnings.

The first Docker frontend build stages passed locally. After integrating the
remote toolchain migration, final image and release builds run in CI, as requested.
These results do not represent a complete E2E/CLI suite or production acceptance.

References: [Vite+ upgrade procedure](https://viteplus.dev/guide/upgrade-project),
[Vitest 5 migration](https://viteplus.dev/guide/vitest-v5),
[Go vulnerability database](https://pkg.go.dev/vuln/).
