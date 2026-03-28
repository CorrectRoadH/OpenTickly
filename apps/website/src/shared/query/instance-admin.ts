import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  disableInstanceUserApi,
  fetchInstanceConfig,
  fetchInstanceHealth,
  fetchInstanceUsers,
  fetchInstanceVersion,
  fetchOrganizations,
  fetchRegistrationPolicy,
  type InstanceVersionInfo,
  restoreInstanceUserApi,
  sendTestEmailApi,
  updateInstanceConfigApi,
  updateRegistrationPolicyApi,
} from "../api/admin-client.ts";
import type {
  InstanceConfig,
  InstanceHealth,
  InstanceUserList,
  OrganizationList,
  RegistrationPolicy,
} from "../api/generated/admin/types.gen.ts";

export function useInstanceHealthQuery() {
  return useQuery<InstanceHealth>({
    queryKey: ["instance-admin", "health"],
    queryFn: fetchInstanceHealth,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useRegistrationPolicyQuery() {
  return useQuery<RegistrationPolicy>({
    queryKey: ["instance-admin", "registration-policy"],
    queryFn: fetchRegistrationPolicy,
    retry: false,
  });
}

export function useUpdateRegistrationPolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: "open" | "closed" | "invite_only") =>
      updateRegistrationPolicyApi(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-admin", "registration-policy"] });
    },
  });
}

export function useInstanceUsersQuery(params?: {
  status?: "active" | "disabled" | "all";
  query?: string;
  page?: number;
}) {
  return useQuery<InstanceUserList>({
    queryKey: ["instance-admin", "users", params],
    queryFn: () =>
      fetchInstanceUsers({
        status: params?.status,
        query: params?.query,
        page: params?.page,
      }),
    retry: false,
  });
}

export function useDisableInstanceUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => disableInstanceUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-admin", "users"] });
    },
  });
}

export function useRestoreInstanceUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => restoreInstanceUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-admin", "users"] });
    },
  });
}

export function useInstanceConfigQuery() {
  return useQuery<InstanceConfig>({
    queryKey: ["instance-admin", "config"],
    queryFn: fetchInstanceConfig,
    retry: false,
  });
}

export function useUpdateInstanceConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => updateInstanceConfigApi(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-admin", "config"] });
      queryClient.invalidateQueries({ queryKey: ["instance-admin", "registration-policy"] });
    },
  });
}

export function useSendTestEmailMutation() {
  return useMutation({
    mutationFn: (to: string) => sendTestEmailApi(to),
  });
}

export function useInstanceVersionQuery() {
  return useQuery<InstanceVersionInfo>({
    queryKey: ["instance-admin", "version"],
    queryFn: fetchInstanceVersion,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationsQuery() {
  return useQuery<OrganizationList>({
    queryKey: ["instance-admin", "organizations"],
    queryFn: fetchOrganizations,
    retry: false,
  });
}
