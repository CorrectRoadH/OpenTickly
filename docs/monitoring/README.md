# Sentry monitoring

The shared website/API image leaves `SENTRY_DSN` and `SENTRY_BROWSER_DSN` empty.
An operator can explicitly configure their own DSNs on any host. The browser
fetches `/web/v1/telemetry/config` once, asynchronously, with a two second abort;
configuration failure leaves it disabled and does not delay rendering. The
endpoint and API schema define the public configuration contract.

The dedicated landing and update Worker contain their project's public DSN.
Landing enables it in a production build; the Worker uses its production build
marker. The `update-worker#dev` entrypoint marks its custom build as development.
Development and tests do not enable these clients implicitly. Environment
defaults to `production`; `VITE_SENTRY_ENVIRONMENT` (landing) or
`SENTRY_ENVIRONMENT` (Worker/API) can distinguish a deployment. SDK tests use
explicit test transports and never send to the real project.

`packages/monitoring` owns the JavaScript data boundary. Errors and streamed spans
are rebuilt from allowed fields, with fixed component labels and operation names.
The final envelope integration removes dynamic sampling operation names and
non-error/non-span items. Valid debug IDs and cleaned code filenames survive for
source map resolution. The Go adapter in `internal/monitoring` uses per-request
hubs and sanitized error/transaction events without replacing the existing update
pinger or registering a global OpenTelemetry provider.

Browser tracing headers target only same-origin API URLs. Server and Worker
instrumentation do not propagate to external services. Root sampling is 0.1,
with 0.01 for the update Worker; incoming sampling decisions are respected.

Builds derive `web@<sha>`, `landing@<sha>` and `update@<sha>` from `SOURCE_SHA`,
`GITHUB_SHA`, or the checkout. A source archive without Git metadata can build
without a release; official release jobs always supply a full SHA. Website emits
`dist/sentry-release.json` for the runtime config endpoint. API release uses
`SENTRY_RELEASE` separately.

`SENTRY_AUTH_TOKEN` is a build-only secret. The Vite plugin targets organization
`instaai` and projects `opentickly-demo`, `opentickly-landing` and
`opentickly-update`. No token means no upload. Docker uses a BuildKit secret mount;
never pass the token as an ARG or copy it into a runtime image. All `.map` files
are removed from final static output, including the website service worker map.
A successful local build does not verify an upload or a production event.

Targeted verification:

- `vp test run packages/monitoring/src/`
- `vp run update-worker#test`
- `go test ./apps/backend/internal/monitoring -count=1`
- `vp run check`
- `vp run website#build`, `vp run landing#build`, `vp run update-worker#build`

Disabling the shared runtime DSNs or reverting the dedicated component change
rolls back monitoring without changing business data or schema. Production
configuration and deployment are separate from local SDK verification.
