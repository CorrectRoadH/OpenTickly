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
      description={
        mode === "login"
          ? "Use your account credentials to enter the workspace shell and restore your current context."
          : "Create your account, establish your identity, and continue directly into the workspace shell."
      }
      sidebarBody={
        mode === "login"
          ? "Sign in to restore your session, default workspace, and account-level preferences."
          : "Create a new account before profile, preferences, and workspace settings become available."
      }
      title={mode === "login" ? "Log in to OpenToggl" : "Create your OpenToggl account"}
    >
      <AuthFeature mode={mode} />
    </PublicMainPanelFrame>
  );
}
