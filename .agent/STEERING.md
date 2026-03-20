# **Critical Steering Work**

## Ensure the sandbox is running correctly

This sandbox runs emulated aarch64 Linux. Apply as needed:

- **Node >= 22 (if required):** Install nvm, persist to `/etc/sandbox-persistent.sh` with `unset NPM_CONFIG_PREFIX` before the nvm source line. Never add bash_completion to that file.

- **Native binary SIGILL crashes (npm):** `npm install` will produce broken arm64 binaries. Follow this exact sequence:

  1. Run `npm install --ignore-scripts` (prevents SIGILL during install)
  2. Fix **all** known native binaries — for each package below, run:
     ```
     cd /tmp && npm pack <pkg>@<version> && tar xzf <tarball> && cp package/<binary> <node_modules_path> && rm -rf package
     ```
     Known SIGILL packages (check versions in node_modules):
     - `@esbuild/linux-arm64` → `bin/esbuild`
     - `@rollup/rollup-linux-arm64-gnu` → `rollup.linux-arm64-gnu.node`
     - `@tailwindcss/oxide-linux-arm64-gnu` → `tailwindcss-oxide.linux-arm64-gnu.node`
     - `@unrs/resolver-binding-linux-arm64-gnu` → `resolver.linux-arm64-gnu.node`
     - `lightningcss-linux-arm64-gnu` → `lightningcss.linux-arm64-gnu.node`
  3. **Verify each binary** before proceeding: `node -e "require('<pkg>')"` (for esbuild, use `node_modules/@esbuild/linux-arm64/bin/esbuild --version` instead since it's a standalone binary, not a requireable module)
  4. **Scan for corrupted files** — `--ignore-scripts` can produce JS files with null bytes:
     ```
     find node_modules -name '*.js' -size +50k | while read f; do
       if od -c "$f" | grep -q '\\0'; then echo "CORRUPT: $f"; fi
     done
     ```
     Fix: `rm -rf node_modules/<corrupt-pkg> && npm install --ignore-scripts`
     Re-scan until clean. Only then start the dev server.

## Main Tasks

Install dependencies (using the sequence above), then install Playwright system dependencies: `sudo npx playwright install-deps chromium 2>&1`. Allow up to 10 minutes for tasks to complete.

Then install the Playwright browser: `npx playwright install chromium`

Start the dev server and take a screenshot. Save it to the `.agent/screenshots` directory.

---

After you finish this work, exit with message `Steering complete`.
