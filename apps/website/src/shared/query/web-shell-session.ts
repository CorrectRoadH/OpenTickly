import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { resolveSsoProfile } from "../api/auth-client.ts";
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
  WorkspaceSsoConfigUpdate,
} from "../api/web/index.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  completeOnboarding,
  getOnboarding,
  getWebSession,
  getWorkspaceSsoConfig,
  loginWebUser,
  logoutWebUser,
  registerWebUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetOnboarding,
  resetPassword,
  testWorkspaceSsoConfig,
  updateWebSession,
  updateWorkspaceSsoConfig,
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

export type { SsoResolveResult } from "../api/auth-client.ts";
export type { SsoConfigCheck, SsoConfigTestResult } from "../api/web/index.ts";

// useSsoResolveMutation looks up the workspace SAML2 profile for an email so
// the dedicated SSO login screen can redirect the browser to the IdP.
export function useSsoResolveMutation() {
  return useMutation({
    mutationFn: (email: string) => resolveSsoProfile(email),
  });
}

const workspaceSsoConfigQueryKey = (workspaceId: number) =>
  ["workspace-sso-config", workspaceId] as const;

// useWorkspaceSsoConfigQuery loads a workspace's SAML2 SSO configuration.
export function useWorkspaceSsoConfigQuery(workspaceId: number) {
  return useQuery({
    queryKey: workspaceSsoConfigQueryKey(workspaceId),
    queryFn: () =>
      unwrapWebApiResult(getWorkspaceSsoConfig({ path: { workspace_id: workspaceId } })),
  });
}

export function useUpdateWorkspaceSsoConfigMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: WorkspaceSsoConfigUpdate) =>
      unwrapWebApiResult(updateWorkspaceSsoConfig({ path: { workspace_id: workspaceId }, body })),
    onSuccess: (updated) => {
      queryClient.setQueryData(workspaceSsoConfigQueryKey(workspaceId), updated);
    },
  });
}

// useTestWorkspaceSsoConfigMutation validates an UNSAVED config so the admin can
// find problems (unreachable metadata, expired certificate, domain conflict, …)
// on the settings page before enabling SSO.
export function useTestWorkspaceSsoConfigMutation(workspaceId: number) {
  return useMutation({
    mutationFn: (body: WorkspaceSsoConfigUpdate) =>
      unwrapWebApiResult(testWorkspaceSsoConfig({ path: { workspace_id: workspaceId }, body })),
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
