import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthFeature } from "../../features/auth/AuthFeature.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps): ReactElement {
  const { t } = useTranslation("auth");

  return (
    <PublicMainPanelFrame
      badge={mode === "login" ? t("accountLogin") : t("accountRegistration")}
      title={mode === "login" ? t("logInTitle") : t("registerTitle")}
    >
      <AuthFeature mode={mode} />
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}
