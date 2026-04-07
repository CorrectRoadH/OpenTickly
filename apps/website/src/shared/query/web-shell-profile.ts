import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MePayload } from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  getMe,
  getPreferences,
  postPreferences,
  postResetToken,
  putMe,
} from "../api/public/track/index.ts";

import { sessionQueryKey, type ProfilePreferencesDto } from "./web-shell.ts";

const profileQueryKey = ["web-profile"] as const;

export function useProfileQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getMe()),
    queryKey: profileQueryKey,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MePayload) => unwrapWebApiResult(putMe({ body: request })),
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey, data);
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function useResetApiTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrapWebApiResult(postResetToken()),
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey, (profile) =>
        profile
          ? {
              ...profile,
              api_token: data,
            }
          : profile,
      );
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKey,
      });
    },
  });
}

export function usePreferencesQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getPreferences()) as Promise<ProfilePreferencesDto>,
    queryKey: ["web-preferences"],
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfilePreferencesDto) =>
      unwrapWebApiResult(postPreferences({ body: request })),
    onSuccess: async (_data, request) => {
      await queryClient.invalidateQueries({
        queryKey: ["web-preferences"],
      });
      queryClient.setQueryData<ProfilePreferencesDto>(["web-preferences"], (old) =>
        old ? { ...old, language_code: request.language_code } : old,
      );
    },
  });
}
