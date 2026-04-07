import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  LoginRequestDto,
  RegisterRequestDto,
  UpdateWebSessionRequestDto,
} from "../api/web-contract.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  completeOnboarding,
  getOnboarding,
  getWebSession,
  loginWebUser,
  logoutWebUser,
  registerWebUser,
  resetOnboarding,
  updateWebSession,
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
    mutationFn: (request: RegisterRequestDto) =>
      unwrapWebApiResult(registerWebUser({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
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
