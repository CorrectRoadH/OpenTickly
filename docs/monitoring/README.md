# Sentry monitoring

The shared website/API image leaves `SENTRY_DSN` and `SENTRY_BROWSER_DSN` empty.
An operator can explicitly configure their own DSNs on any host. The Go server
embeds the same validated public configuration as non-executable JSON in the
website HTML. The website initializes synchronously before importing the app
bootstrap, including its session prefetch. Empty or malformed configuration
leaves monitoring disabled immediately, with no configuration fetch or timer.
JSON encoding escapes HTML delimiters and the virtual HTML file reports its
actual injected length. `/web/v1/telemetry/config` and its schema remain available
for existing clients. The browser release still comes from the built website's
`sentry-release.json`, separately from the API release. A development/static host
without the Go HTML injection leaves website monitoring disabled.

The dedicated landing and update Worker contain their project's public DSN.
Landing enables it in a production build; the Worker uses its production build
marker. The `update-worker#dev` entrypoint marks its custom build as development.
Development and tests do not enable these clients implicitly. Environment
defaults to `production`; `VITE_SENTRY_ENVIRONMENT` (landing) or
`SENTRY_ENVIRONMENT` (Worker/API) can distinguish a deployment. SDK tests use
explicit test transports and never send to the real project.

The API, website, landing, and update Worker send the original error types,
messages, and stack frames. JavaScript `Error.cause` chains and wrapped Go
errors retain their causes. The same credential filters apply to each exception
in the chain. Browser debug IDs and code filenames remain available for source
map resolution. API and Worker request errors also include the registered route
template, HTTP method, response status, and existing operation or transaction
name. An unmatched route uses a fixed label. Unhandled failures without a
committed response use status 500. A handled update fallback records its
successful response status.

The error event filters credential headers, sensitive query parameters and
structured fields, and credential strings such as bearer tokens, API keys, JWTs,
URL userinfo, and the configured Sentry DSN public key. Other business details
remain available. Default PII collection stays off and request and response bodies
are excluded. Expected 4xx responses and client cancellations do not produce error
events. Credential filtering also runs at the JavaScript envelope boundary.

Streamed spans retain their field allowlist and fixed component and operation
names. The final envelope integration removes dynamic sampling operation names
and items outside the error/span/profile/log/metric/session/client-report
allowlist. The Go adapter uses per-request hubs and a separate transaction filter
alongside the existing update pinger.

Browser tracing headers target only same-origin API URLs. The dedicated API update client propagates only to its exact HTTPS root; other server and Worker
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

## Business tracing and browser profiles

The approved extension is `it-infra/docs/engineering/sentry/performance.md`.
`packages/monitoring/src/operations.ts` registers finite business names and wraps
actual asynchronous results without replacing original errors. Go application
services use request context, and each background update check gets a separate
hub and finite transaction. Only the dedicated HTTPS update root receives safe
trace headers; redirects remove them. GitHub and user webhook targets remain
outside propagation.

Browser SDK targets and the outer fetch redirect guard share one finite allowlist.
XHR tracing is disabled. The existing `/api/v9/desktop_login` protocol redirect
is excluded from both propagation and the guard, preserving its original semantics. Landing has no API propagation; its automatic page and
navigation spans use fixed site operation names. Empty runtime DSN leaves fetch
and profiling untouched.

Browser operations use inactive spans with an independent lifetime. `traceOperation`
passes an explicit `context.run(callback)` to its callback; only synchronous
invocations activate a scope. The activation callback returns void, while the
business Promise settles outside that scope. Awaited work keeps its original
result/error/cancellation and finishes the operation once. An `await` does not
implicitly carry a browser scope: requests or nested operations started afterwards
must use `context.run`. Unowned requests follow the actual pageload/navigation.
No global current-operation or provider replacement is used.

The handwritten API-client adapter captures context at each generated method's
synchronous entry, then reactivates it only to start that request's fetch after
async auth/validation. It preserves each call's configured transport, options,
interceptors and error behavior; it does not replace global fetch or auth. All six
generated client singletons install this adapter once. Entity-write queues capture
the submitting context before deferring execution, and the workspace lookup and
post-write invalidation boundaries explicitly reactivate their business context.

`concurrent-browser.test.ts` uses one real automatic pageload and the actual
generated client. A and B both await separate gates and async auth; B completes
before A. HTTP parent IDs match each operation, a request without explicit context
belongs to pageload, no business scope remains active, and each operation counts
once. The queue regression uses the real SDK and app QueryClient factory; the
workerd regression continues to exercise the unchanged Worker provider.

The Vite build emits `sentry-profile-assets.json` from emitted JS and Babel AST
Identifier nodes, alongside the same release's assets. Source strings are not
collected. Profile frame paths and symbols require exact manifest membership;
missing or wrong-release manifests redact frames without changing indices or
blocking error/tracing startup. Only SDK v11.12 `profile_chunk` v2 is accepted;
legacy profiles, Replay, Cron and unknown items remain rejected. Logs, metrics,
sessions and client reports follow the separate format contract below. The final envelope boundary revalidates typed streamed spans and
preserves genuine profiler/thread correlation only while profiling is enabled.

Browser profiling uses trace lifecycle, root sampling 0.1 and session sampling
0.1. Production activation remains pending the parent's project IP-scrub and persisted-data
verification; no extra deployment environment variable is required. Isolated
Chromium tests enable profiling with a local transport. Unsupported browsers
retain error/tracing. Go and the update Worker only trace; the landing is static
output served by an uninstrumented Node static server, so no Node native
profiler/final-image claim applies here. HTML responses include Document-Policy
without removing existing directives.


## Fixed logs, operation metrics, and anonymous health

The approved format extension is `it-infra/docs/engineering/sentry/format.md`.
The SDK transport's `send` method revalidates complete envelopes after all SDK
hooks and scope merges, including direct transport calls. Cleaning is synchronous;
`flush` remains the SDK transport's bounded flush with no extra filtering queue.
Individual invalid items are discarded without suppressing valid siblings.

Only fixed failure/degradation and real process lifecycle messages are allowed.
Existing console and business loggers are not forwarded. Every top-level business
wrapper records one `app.operation.count` counter and millisecond distribution,
including unsampled traces. Nested business stages do not repeat these metrics.
Outcomes are `success`, `error`, `cancelled`, or `rejected`; explicit domain
validation/authentication rejections are not service errors. Existing audit
cleanup and update pinger ticks record scheduler count/duration, including empty
work. The scheduler and its configuration/lifecycle remain unchanged.

JS wire types are `log` and `trace_metric` with numeric version 2, matching
content types and actual item counts. Go uses the SDK's items-only container,
`time.Time` timestamps and int64 counters. Its hooks remove server hostname and
scope/call data. All attributes are rebuilt from fixed safe fields.

BrowserSession uses the actual SDK page lifecycle and random sid, with cumulative
init/errors/status preserved; did, IP, UA and unknown attrs are removed. Browser
SDK 11.12 reports unhandled exceptions as `unhandled`, which is preserved rather
than rewritten to core's `crashed`. This supports anonymous session health, not
distinct-user health. Server/Worker health uses operation metrics, without
pretending to be browser sessions. Known SDK client_report reason/category/count
records are allowed, with no recursive reporting. Browser delivery is verified
through the real visibility lifecycle; Go's default HTTP transport emits its
native reports. Cloudflare SDK 11.12 has no public automatic report-drain path:
its option and final-wire allowlist remain enabled, but automatic Worker delivery
is not claimed and no protected SDK method is called. `check_in`, aggregated
`sessions`, Replay, attachments and unknown item types are still rejected.

## Continuous request traces

The browser uses `parentSpanIsAlwaysRootSpan: false`. Its automatic HTTP spans
remain children of the active business operation even while pageload is active.
Known method/route shapes get fixed operation names; unknown URLs retain the
HTTP fallback. Go request transactions use registered router templates, with
`health.check` for health/readiness and `http.server` for unknown/static routes.
Go business stages use `task`, retaining their registered operation names.

The pgx pool installs a QueryTracer. Driver Query/QueryRow/Exec spans are named
`db.query`; batch execution is `db.batch`. They end at the actual driver callback,
including Rows close, and retain errors and cancellation. No SQL, arguments,
connection metadata or results are attached. Pool acquisition and transaction
wall time are not separately measured. Calls without an active configured
request/task create no standalone database root. Admin adapters, SMTP config
reads and user-ID allocation carry the existing request context; startup and
shutdown contexts remain independent.

Each dedicated update-manifest call adds one `http.client` child spanning the
actual call and response decoding, and derives safe propagation from that child.
Only the exact configured HTTPS update root receives headers. Redirects retain
the existing client behavior while removing telemetry headers.

The update Worker reuses its SDK HTTP root as `update.request`, counts the
operation once, and classifies real 4xx responses as rejected and 5xx as errors.
Upstream waits use `http.client`, response/analytics work uses `task`. The existing
Cloudflare `cacheTtl` remains unchanged; the upstream span measures the whole
fetch and does not claim cache-hit timing. Valid two-part trace headers may omit
a sampling decision; explicit sampled=0 is preserved.

The directed Chromium fixture builds the real website HTML and main entry,
substituting only the app bootstrap with an isolated read harness. Go injects
the configuration using the same production helper. The harness calls the real
project route, application service and PostgreSQL store in an ephemeral schema,
and checks every adjacent parent ID. This tests telemetry startup and transport,
not the complete React UI or a production deployment. `DATABASE_URL` and
`OPENTICKLY_TRACE_REDIS_URL` must point to isolated local test services.
