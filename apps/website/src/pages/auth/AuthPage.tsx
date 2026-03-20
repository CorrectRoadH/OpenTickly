import { type ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";

import { mapSessionBootstrap } from "../../entities/session/session-bootstrap.ts";
import { AuthForm } from "../../features/auth/AuthForm.tsx";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import { useLoginMutation, useRegisterMutation } from "../../shared/query/web-shell.ts";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps): ReactElement {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const mutation = mode === "login" ? loginMutation : registerMutation;

  return (
    <div className="min-h-screen px-4 py-8">
      <AuthForm
        mode={mode}
        onSubmit={async (payload) => {
          const session = await mutation.mutateAsync(payload as never);
          void navigate({
            to: resolveHomePath(mapSessionBootstrap(session)),
          });
        }}
      />
    </div>
  );
}
