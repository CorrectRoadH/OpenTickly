import { AppButton, AppCheckbox, AppPanel } from "@opentickly/web-ui";
import { type ReactElement, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useUpdateWorkspacePermissionsMutation,
  useWorkspacePermissionsQuery,
} from "../../shared/query/web-shell.ts";

type PermissionConfigPageProps = {
  workspaceId: number;
};

type PermissionFormValues = {
  limitPublicProjectData: boolean;
  onlyAdminsMayCreateProjects: boolean;
  onlyAdminsMayCreateTags: boolean;
  onlyAdminsSeeTeamDashboard: boolean;
};

const defaultPermissionValues: PermissionFormValues = {
  limitPublicProjectData: false,
  onlyAdminsMayCreateProjects: false,
  onlyAdminsMayCreateTags: false,
  onlyAdminsSeeTeamDashboard: false,
};

const permissionFieldNames: Array<keyof PermissionFormValues> = [
  "onlyAdminsMayCreateProjects",
  "onlyAdminsMayCreateTags",
  "onlyAdminsSeeTeamDashboard",
  "limitPublicProjectData",
];

export function PermissionConfigPage({ workspaceId }: PermissionConfigPageProps): ReactElement {
  const { t } = useTranslation("settings");
  const permissionsQuery = useWorkspacePermissionsQuery(workspaceId);
  const updateMutation = useUpdateWorkspacePermissionsMutation(workspaceId);
  const serverValues: PermissionFormValues = permissionsQuery.data
    ? {
        limitPublicProjectData: permissionsQuery.data.workspace.limit_public_project_data ?? false,
        onlyAdminsMayCreateProjects:
          permissionsQuery.data.workspace.only_admins_may_create_projects ?? false,
        onlyAdminsMayCreateTags:
          permissionsQuery.data.workspace.only_admins_may_create_tags ?? false,
        onlyAdminsSeeTeamDashboard:
          permissionsQuery.data.workspace.only_admins_see_team_dashboard ?? false,
      }
    : defaultPermissionValues;
  const { handleSubmit, watch, setValue } = useForm<PermissionFormValues>({
    values: serverValues,
  });
  const [status, setStatus] = useState<string | null>(null);

  if (permissionsQuery.isPending || !permissionsQuery.data) {
    if (permissionsQuery.isError) {
      return (
        <AppPanel tone="danger">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">{t("permissionConfiguration")}</h1>
            <p className="text-sm leading-6 text-slate-400">{t("workspacePermissionPolicy")}</p>
            <p className="text-sm leading-6 text-slate-400">{t("workspaceAccessRules")}</p>
          </div>

          <section className="mt-6 rounded-xl border border-rose-500/30 bg-[var(--track-surface-danger-alt)] px-5 py-4 text-sm text-rose-200">
            <p className="font-semibold">{t("permissionPolicyTemporarilyUnavailable")}</p>
            <p className="mt-2">{t("reloadAfterWorkspaceSettingsRecover")}</p>
          </section>
        </AppPanel>
      );
    }

    return (
      <AppPanel tone="muted">
        <p className="text-sm font-medium text-slate-400">{t("loadingWorkspacePermissions")}</p>
      </AppPanel>
    );
  }

  return (
    <AppPanel data-testid="permission-config-page" tone="muted">
      <form
        className="space-y-6"
        data-testid="permission-config-form"
        onSubmit={handleSubmit(async (values) => {
          setStatus(null);

          try {
            await updateMutation.mutateAsync({
              workspace: {
                limit_public_project_data: values.limitPublicProjectData,
                only_admins_may_create_projects: values.onlyAdminsMayCreateProjects,
                only_admins_may_create_tags: values.onlyAdminsMayCreateTags,
                only_admins_see_team_dashboard: values.onlyAdminsSeeTeamDashboard,
              },
            });
            setStatus(t("permissionsSaved"));
          } catch {
            toast.error(t("unableToSavePermissions"));
          }
        })}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{t("permissionConfiguration")}</h1>
          <p className="text-sm leading-6 text-slate-500">{t("workspacePermissionPolicy")}</p>
          <p className="text-sm leading-6 text-slate-500">{t("workspaceAccessRules")}</p>
          <p className="text-sm leading-6 text-slate-400">
            {t("permissionConfigurationDescription")}
          </p>
        </div>

        <div className="space-y-4" data-testid="permission-config-toggles">
          {permissionFieldNames.map((name) => (
            <label
              className="flex items-start gap-3 rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3"
              key={name}
            >
              <AppCheckbox
                aria-label={t(name)}
                checked={watch(name)}
                className="mt-1"
                onChange={(e) => setValue(name, e.target.checked)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-white">{t(name)}</span>
                <span className="block text-sm leading-6 text-slate-400">
                  {t(`${name}Description`)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <AppButton disabled={updateMutation.isPending} type="submit">
            {t("savePermissions")}
          </AppButton>
          {status ? (
            <p className="text-sm font-medium text-[var(--track-text-accent)]">{status}</p>
          ) : null}
        </div>
      </form>
    </AppPanel>
  );
}
