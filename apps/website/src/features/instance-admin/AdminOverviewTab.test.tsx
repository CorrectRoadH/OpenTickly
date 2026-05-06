/* @vitest-environment jsdom */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementItem } from "./AdminOverviewTab.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, values?: Record<string, string>) => {
        if (key === "instanceAdmin:updateAvailable" && values?.version) {
          return `Update available: ${values.version}`;
        }
        if (key === "instanceAdmin:releasedOn" && values?.date) {
          return `Released on ${values.date}`;
        }
        return key;
      },
    }),
  };
});

describe("AdminOverviewTab", () => {
  it("renders announcement markdown as formatted content", () => {
    const markup = renderToStaticMarkup(
      <AnnouncementItem
        announcement={{
          id: "docker-image-migration",
          severity: "info",
          title: "Docker Image Migration Notice",
          published_at: "2026-05-05T00:00:00Z",
          body_markdown:
            "**Important**: The Docker image and Project has been renamed.\n\n- Pull the new image",
          link: undefined,
        }}
      />,
    );

    expect(markup).toContain(">Important</strong>");
    expect(markup).toContain(">Pull the new image</li>");
  });
});
