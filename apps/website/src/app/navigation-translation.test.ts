import { expect, it } from "vite-plus/test";

import navigation from "../locales/en/navigation.json";

it("keeps the sidebar label capitalized while preserving the organization member count", () => {
  expect(navigation.members).toBe("Members");
  expect(navigation.memberPlural).toBe("members");
});
