import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./OrganizationSettingsPage.tsx", import.meta.url), "utf8");
const zhSettings = JSON.parse(
  readFileSync(new URL("../../locales/zh/settings.json", import.meta.url), "utf8"),
) as Record<string, string>;

describe("organization settings i18n", () => {
  it("keeps organization settings copy localized for zh", () => {
    expect(zhSettings.organizationSettings).toBeTruthy();
    expect(zhSettings.organizationGeneral).toBeTruthy();
    expect(zhSettings.organizationMembers).toBeTruthy();
    expect(zhSettings.organizationGroups).toBeTruthy();
    expect(zhSettings.organizationDanger).toBeTruthy();
    expect(zhSettings.organizationName).toBeTruthy();
    expect(zhSettings.changeOrganizationName).toBeTruthy();
    expect(zhSettings.organizationOverview).toBeTruthy();
    expect(zhSettings.deleteOrganization).toBeTruthy();
    expect(zhSettings.deleteOrganizationDescription).toBeTruthy();
    expect(zhSettings.typeToConfirm).toBeTruthy();
    expect(zhSettings.deleteThisOrganization).toBeTruthy();
    expect(zhSettings.organizationSaved).toBeTruthy();
    expect(zhSettings.couldNotSaveOrganizationSettings).toBeTruthy();
    expect(zhSettings.couldNotDeleteOrganization).toBeTruthy();
    expect(zhSettings.multiWorkspace).toBeTruthy();
    expect(zhSettings.maxWorkspaces).toBeTruthy();
    expect(zhSettings.enabled).toBeTruthy();
    expect(zhSettings.disabled).toBeTruthy();
  });

  it("does not leave organization settings actions hardcoded in English", () => {
    expect(pageSource).not.toContain(">Save<");
    expect(pageSource).not.toContain("Type <span");
    expect(pageSource).not.toContain("to confirm");
  });
});
