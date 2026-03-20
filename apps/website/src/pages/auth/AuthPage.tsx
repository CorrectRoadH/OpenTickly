import { useState, type ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";

import { mapSessionBootstrap } from "../../entities/session/session-bootstrap.ts";
import { AuthForm } from "../../features/auth/AuthForm.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="min-h-screen px-4 py-8">
      <AuthForm
        errorMessage={errorMessage}
        mode={mode}
        onSubmit={async (payload) => {
          setErrorMessage(null);

          try {
            const session = await mutation.mutateAsync(payload as never);
            void navigate({
              to: resolveHomePath(mapSessionBootstrap(session)),
            });
          } catch (error) {
            setErrorMessage(resolveAuthErrorMessage(error));
          }
        }}
      />
    </div>
  );
}

function resolveAuthErrorMessage(error: unknown): string {
  if (error instanceof WebApiError) {
    if (typeof error.data === "string" && error.data.length > 0) {
      return error.data;
    }

    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string" &&
      error.data.message.length > 0
    ) {
      return error.data.message;
    }
  }

  return "We couldn't complete that request. Try again.";
}
