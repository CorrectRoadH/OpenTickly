import { createInstance } from "i18next";
import { expect, it } from "vite-plus/test";

import en from "../../locales/en/members.json";
import es from "../../locales/es/members.json";
import fr from "../../locales/fr/members.json";
import ja from "../../locales/ja/members.json";
import ko from "../../locales/ko/members.json";
import pl from "../../locales/pl/members.json";
import pt from "../../locales/pt/members.json";
import zh from "../../locales/zh/members.json";

it("renders member counts without exposing template syntax", async () => {
  const i18n = createInstance();
  await i18n.init({
    defaultNS: "members",
    fallbackLng: "en",
    lng: "en",
    resources: {
      en: { members: en },
      es: { members: es },
      fr: { members: fr },
      ja: { members: ja },
      ko: { members: ko },
      pl: { members: pl },
      pt: { members: pt },
      zh: { members: zh },
    },
  });

  const summary = (count: number) =>
    i18n.t("showingMembersInWorkspace", {
      count,
      workspaceName: "Example",
      activeCount: count,
      disabledCount: 0,
      invitedCount: 0,
    });

  expect(summary(1)).toBe("1 member in Example. Active: 1 · Disabled: 0 · Invited: 0");
  expect(summary(2)).toBe("2 members in Example. Active: 2 · Disabled: 0 · Invited: 0");

  for (const language of ["es", "fr", "ja", "ko", "pl", "pt", "zh"]) {
    await i18n.changeLanguage(language);
    expect(summary(1)).not.toContain("{{");
    expect(summary(2)).not.toContain("{{");
  }
});
