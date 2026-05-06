import { type ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { LoginRequestDto, RegisterRequestDto } from "../../shared/api/web-contract.ts";
import type { RegistrationPendingVerification } from "../../shared/api/web/index.ts";
import { WebApiError } from "../../shared/api/web-client.ts";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import { useLoginMutation, useRegisterMutation } from "../../shared/query/web-shell.ts";
import { AuthForm } from "./AuthForm.tsx";

type AuthFeatureProps = {
  mode: "login" | "register";
};

function isVerificationPending(data: unknown): data is RegistrationPendingVerification {
  return (
    data != null &&
    typeof data === "object" &&
    "email_verification_required" in data &&
    (data as RegistrationPendingVerification).email_verification_required === true
  );
}

export function AuthFeature({ mode }: AuthFeatureProps): ReactElement {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  async function handleSubmit(payload: LoginRequestDto | RegisterRequestDto) {
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync(payload as LoginRequestDto);
      } else {
        const result = await registerMutation.mutateAsync(payload as RegisterRequestDto);
        if (isVerificationPending(result.data)) {
          void navigate({
            to: "/verify-email",
            search: { email: result.data.email },
          });
          return;
        }
      }

      void navigate({
        to: resolveHomePath(),
      });
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, t));
    }
  }

  return (
    <AuthForm
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

    if (typeof error.userMessage === "string" && error.userMessage.length > 0) {
      return error.userMessage;
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
