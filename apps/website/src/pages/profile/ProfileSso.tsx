import { AppButton, AppInlineNotice, SurfaceCard } from "@opentickly/web-ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getWorkspaceSsoIdentity,
  linkWorkspaceSsoIdentity,
  listSsoIdentities,
  unlinkWorkspaceSsoIdentity,
  type SsoIdentity,
} from "../../shared/api/web/index.ts";
import { unwrapWebApiResult, WebApiError } from "../../shared/api/web-client.ts";

export function ProfileSso({ workspaceId }: { workspaceId: number }) {
  const { t } = useTranslation("profile");
  const bindings = useQuery({
    queryKey: ["sso-identities"],
    queryFn: () => unwrapWebApiResult(listSsoIdentities()),
  });
  const current = useQuery({
    queryKey: ["sso-identity", workspaceId],
    queryFn: () =>
      unwrapWebApiResult(getWorkspaceSsoIdentity({ path: { workspace_id: workspaceId } })),
    enabled: workspaceId > 0,
  });
  const items = [...(bindings.data ?? [])];
  if (current.data && !items.some((item) => item.workspace_id === workspaceId))
    items.push(current.data);
  return (
    <SurfaceCard>
      <section className="space-y-3 p-5" data-testid="profile-sso">
        <h3 className="text-[14px] font-semibold">{t("ssoTitle")}</h3>
        <p className="text-[12px] text-[var(--track-text-muted)]">{t("ssoDescription")}</p>
        {bindings.isError || current.isError ? (
          <AppInlineNotice tone="error">{t("ssoLoadFailed")}</AppInlineNotice>
        ) : null}
        {items
          .filter((item) => item.enabled || item.linked)
          .map((item) => (
            <SsoBinding key={item.workspace_id} item={item} />
          ))}
      </section>
    </SurfaceCard>
  );
}

function SsoBinding({ item }: { item: SsoIdentity }) {
  const { t } = useTranslation("profile");
  const [password, setPassword] = useState("");
  const link = useMutation({
    mutationFn: () =>
      unwrapWebApiResult(
        linkWorkspaceSsoIdentity({
          path: { workspace_id: item.workspace_id },
          headers: { "Content-Type": "application/json" },
        }),
      ),
    onSuccess: (result) => window.location.assign(result.authorization_url),
  });
  const unlink = useMutation({
    mutationFn: () =>
      unwrapWebApiResult(
        unlinkWorkspaceSsoIdentity({
          path: { workspace_id: item.workspace_id },
          body: { password },
        }),
      ),
    onSuccess: () => window.location.assign("/login"),
  });
  const error = link.error ?? unlink.error;
  return (
    <div className="space-y-3 border-t border-[var(--track-border)] pt-3">
      <p className="text-[14px]">
        {item.workspace_name} · {item.profile_name} —{" "}
        {t(item.linked ? "ssoLinked" : "ssoNotLinked")}
      </p>
      {item.linked ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            unlink.mutate();
          }}
        >
          <label className="flex flex-col gap-2 text-[12px]">
            {t("ssoPassword")}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-9 max-w-sm rounded-md border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px]"
            />
          </label>
          <p className="text-[12px] text-[var(--track-text-muted)]">{t("ssoUnlinkHelp")}</p>
          <AppButton type="submit" disabled={unlink.isPending || !password}>
            {t("ssoUnlink")}
          </AppButton>
        </form>
      ) : (
        <AppButton
          type="button"
          disabled={!item.enabled || link.isPending}
          onClick={() => link.mutate()}
        >
          {t("ssoLink")}
        </AppButton>
      )}
      {error ? (
        <AppInlineNotice tone="error">
          {error instanceof WebApiError ? error.userMessage : t("ssoActionFailed")}
        </AppInlineNotice>
      ) : null}
    </div>
  );
}
