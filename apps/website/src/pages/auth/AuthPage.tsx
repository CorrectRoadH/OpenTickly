import { type ReactElement } from "react";

import { AuthFeature } from "../../features/auth/AuthFeature.tsx";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps): ReactElement {
  return (
    <div className="min-h-screen px-4 py-8">
      <AuthFeature mode={mode} />
    </div>
  );
}
