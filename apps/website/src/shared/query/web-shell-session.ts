import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  LoginRequestDto,
  RegisterRequestDto,
  UpdateWebSessionRequestDto,
} from "../api/web-contract.ts";
import type {
  ForgotPasswordRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "../api/web/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  completeOnboarding,
  getOnboarding,
  getWebSession,
  loginWebUser,
  logoutWebUser,
  registerWebUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetOnboarding,
  resetPassword,
  updateWebSession,
  verifyEmail,
} from "../api/web/index.ts";

import { sessionQueryKey } from "./web-shell.ts";

export function useSessionBootstrapQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getWebSession()),
    queryKey: sessionQueryKey,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequestDto) => unwrapWebApiResult(loginWebUser({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RegisterRequestDto) => {
      const result = await registerWebUser({ body: request });
      if (result.error !== undefined) {
        const status = result.response?.status ?? 0;
        const url = result.request?.url ?? "unknown request";
        throw new (await import("../api/web-client.ts")).WebApiError(
          `Request failed for ${url}`,
          status,
          result.error,
        );
      }
      return { data: result.data, status: result.response?.status ?? 0 };
    },
    onSuccess: ({ data, status }) => {
      if (status === 201) {
        queryClient.setQueryData(sessionQueryKey, data);
      }
    },
  });
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: VerifyEmailRequest) => unwrapWebApiResult(verifyEmail({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: async (request: ForgotPasswordRequest) => {
      await unwrapWebApiResult(requestPasswordReset({ body: request }));
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (request: ResetPasswordRequest) => {
      await unwrapWebApiResult(resetPassword({ body: request }));
    },
  });
}

export function useResendVerificationEmailMutation() {
  return useMutation({
    mutationFn: async (request: ResendVerificationEmailRequest) => {
      await unwrapWebApiResult(resendVerificationEmail({ body: request }));
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await unwrapWebApiResult(logoutWebUser());
    },
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}

export function useUpdateWebSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWebSessionRequestDto) =>
      unwrapWebApiResult(updateWebSession({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
    },
  });
}

export type SsoInfo = {
  enabled: boolean;
  providerName: string;
};

// useSsoInfoQuery reports whether instance-level OIDC single sign-on is
// configured, so the login page and SSO settings tab can reflect it. The
// endpoint is a plain unauthenticated browser route (not the typed web API),
// so it is fetched directly.
export function useSsoInfoQuery() {
  return useQuery({
    queryKey: ["sso-info"] as const,
    queryFn: async (): Promise<SsoInfo> => {
      const response = await fetch("/auth/sso/info", { credentials: "same-origin" });
      if (!response.ok) {
        return { enabled: false, providerName: "SSO" };
      }
      const data = (await response.json()) as { enabled?: boolean; provider_name?: string };
      return {
        enabled: data.enabled === true,
        providerName:
          typeof data.provider_name === "string" && data.provider_name.length > 0
            ? data.provider_name
            : "SSO",
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

const onboardingQueryKey = () => ["onboarding"] as const;

export function useOnboardingQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getOnboarding()),
    queryKey: onboardingQueryKey(),
  });
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { version: number; language_code?: string }) =>
      unwrapWebApiResult(completeOnboarding({ body: request })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKey() });
    },
  });
}

export function useResetOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrapWebApiResult(resetOnboarding()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKey() });
    },
  });
}
