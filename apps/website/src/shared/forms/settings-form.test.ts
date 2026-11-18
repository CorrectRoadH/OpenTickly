import { expect, it } from "vite-plus/test";
import {
  createOrganizationSettingsFormValues,
  mapOrganizationSettingsFormToRequest,
} from "./settings-form.ts";

it("renames an organization independently of read-only counts and limits", () => {
  const values = createOrganizationSettingsFormValues({
    name: "Original",
    max_workspaces: -1,
  });
  expect(mapOrganizationSettingsFormToRequest({ ...values, name: "Renamed" })).toEqual({
    name: "Renamed",
  });
});
