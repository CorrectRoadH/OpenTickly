import { afterEach, expect, it } from "vite-plus/test";
import { createAppQueryClient } from "../../../apps/website/src/shared/query/query-client.ts";
import * as Sentry from "@sentry/react";
import { traceOperation } from "./operations.ts";
import { envelopePrivacy } from "./envelope.ts";
import { privacyOptions } from "./policy.ts";
import type { Envelope, SerializedStreamedSpanContainer } from "@sentry/core";
import { writeEntity } from "../../../apps/website/src/shared/query/entity-writes.ts";

afterEach(async () => {
  await Sentry.close();
  Sentry.getCurrentScope().setClient(undefined);
});
it("keeps queued entity writes attached to the operation captured at submission", async () => {
  const envelopes: Envelope[] = [];
  const config = {
    dsn: "https://public@example.invalid/1",
    environment: "production",
    release: "web@test",
  };
  Sentry.init({
    ...privacyOptions("web", config),
    parentSpanIsAlwaysRootSpan: false,
    tracesSampleRate: 1,
    defaultIntegrations: false,
    integrations: [envelopePrivacy(config)],
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  const client = createAppQueryClient();
  let release!: () => void;
  const pending = new Promise<void>((done) => {
    release = done;
  });
  const first = traceOperation("project.save", () =>
    writeEntity(client, "same", async () => {
      Sentry.startSpan({ name: "project.list", op: "ui.action" }, () => {});
      await pending;
      return "A";
    }),
  );
  const second = traceOperation("client.save", () =>
    writeEntity(client, "same", async () =>
      Sentry.startSpan({ name: "client.list", op: "ui.action" }, () => "B"),
    ),
  );
  // Submitting promises must not leave either operation active in the caller.
  expect(Sentry.getActiveSpan()).toBeUndefined();
  release();
  expect(await Promise.all([first, second])).toEqual(["A", "B"]);
  expect(Sentry.getActiveSpan()).toBeUndefined();
  await Sentry.flush(2000);
  const spans = envelopes.flatMap((e) =>
    e[1].flatMap((i) =>
      i[0].type === "span" ? (i[1] as SerializedStreamedSpanContainer).items : [],
    ),
  );
  expect(spans).toHaveLength(4);
  for (const [child, parent] of [
    ["project.list", "project.save"],
    ["client.list", "client.save"],
  ]) {
    const parentSpan = spans.find((s) => s.name === parent);
    expect(parentSpan).toBeDefined();
    expect(spans.find((s) => s.name === child)).toMatchObject({
      parent_span_id: parentSpan?.span_id,
      trace_id: parentSpan?.trace_id,
    });
  }
  client.clear();
});
