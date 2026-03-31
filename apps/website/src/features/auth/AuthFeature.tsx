import { useState, type ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoginRequestDto, RegisterRequestDto } from "../../shared/api/web-contract.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import { useLoginMutation, useRegisterMutation } from "../../shared/query/web-shell.ts";
import { AuthForm } from "./AuthForm.tsx";

type AuthFeatureProps = {
  mode: "login" | "register";
};

export function AuthFeature({ mode }: AuthFeatureProps): ReactElement {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(payload: LoginRequestDto | RegisterRequestDto) {
    setErrorMessage(null);

    try {
      if (mode === "login") {
        await loginMutation.mutateAsync(payload as LoginRequestDto);
      } else {
        await registerMutation.mutateAsync(payload as RegisterRequestDto);
      }

      void navigate({
        to: resolveHomePath(),
      });
    } catch (error) {
      setErrorMessage(resolveAuthErrorMessage(error, t));
    }
  }

  return (
    <AuthForm
      errorMessage={errorMessage}
      isSubmitting={loginMutation.isPending || registerMutation.isPending}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}

function resolveAuthErrorMessage(error: unknown, t: (key: string) => string): string {
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

  return t("couldNotCompleteRequest");
}
