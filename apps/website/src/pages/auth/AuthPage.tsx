import { type ReactElement } from "react";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthFeature } from "../../features/auth/AuthFeature.tsx";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps): ReactElement {
  return (
    <PublicMainPanelFrame
      badge={mode === "login" ? "Account Login" : "Account Registration"}
      title={mode === "login" ? "Log in to OpenToggl" : "Create your OpenToggl account"}
    >
      <AuthFeature mode={mode} />
    </PublicMainPanelFrame>
  );
}
