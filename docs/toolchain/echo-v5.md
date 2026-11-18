# Echo v5 migration

Upgrade the backend to Echo v5.4.6 and generate the existing OpenAPI server
bindings with oapi-codegen v2.8.2 and its `echo5-server` target. The OpenAPI
documents, route registrations, methods, handler middleware order, status
codes, JSON response shapes and authentication rules remain the API contract.

## HTTP errors and server shutdown

The HTTP adapter owns structured response errors. The error carries an HTTP
status, the existing response payload and an internal cause for request logs.
The central handler writes the established error shape and keeps handling
framework errors from Echo middleware and generated parameter binders. The
existing committed-response guard, request IDs and severity rules apply.

The bootstrap owns one `http.Server` with the Echo router as its handler. Startup
propagates listen errors. SIGINT and SIGTERM use the existing shutdown deadline,
draining active requests before reporting service stop and flushing telemetry.

## Request validation and authentication

The HTTP adapter uses the existing kin-openapi router and request filter from
an Echo v5 middleware. Build the router from the same prepared specification
for each route group. Reuse each group's existing path, header, and validation
exceptions. Carry the current Echo context into the filter callback so the
existing authentication handlers and cached principal are shared with the
route handlers. Authentication failures retain their established HTTP
response. Requests rejected by the filter must never reach the route handler.
Avoid the net/http middleware's default plain-text error response.

## Acceptance

Regenerate all Go bindings from the checked-in specs, then verify generation is
repeatable. Run the HTTP server tests for structured errors, request IDs and
cookie-origin enforcement. Run public Track, Reports and Webhooks tests
against temporary PostgreSQL, including authenticated and rejected requests,
validation exceptions and invalid request bodies. Run bootstrap startup and
shutdown tests with isolated dependencies. Check the final Go module graph
for the removal of Echo v4 and its middleware.
