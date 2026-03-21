import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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

const permissionFields: Array<{
  description: string;
  label: string;
  name: keyof PermissionFormValues;
}> = [
  {
    description: "Restrict project creation to workspace admins.",
    label: "Only admins may create projects",
    name: "onlyAdminsMayCreateProjects",
  },
  {
    description: "Restrict tag creation to workspace admins.",
    label: "Only admins may create tags",
    name: "onlyAdminsMayCreateTags",
  },
  {
    description: "Hide the team dashboard from non-admin members.",
    label: "Only admins see team dashboard",
    name: "onlyAdminsSeeTeamDashboard",
  },
  {
    description: "Limit public project data in reports to admins.",
    label: "Limit public project data",
    name: "limitPublicProjectData",
  },
];

export function PermissionConfigPage({ workspaceId }: PermissionConfigPageProps): ReactElement {
  const permissionsQuery = useWorkspacePermissionsQuery(workspaceId);
  const updateMutation = useUpdateWorkspacePermissionsMutation(workspaceId);
  const { handleSubmit, register, reset } = useForm<PermissionFormValues>({
    defaultValues: defaultPermissionValues,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsQuery.data) {
      return;
    }

    reset({
      limitPublicProjectData: permissionsQuery.data.workspace.limit_public_project_data,
      onlyAdminsMayCreateProjects: permissionsQuery.data.workspace.only_admins_may_create_projects,
      onlyAdminsMayCreateTags: permissionsQuery.data.workspace.only_admins_may_create_tags,
      onlyAdminsSeeTeamDashboard: permissionsQuery.data.workspace.only_admins_see_team_dashboard,
    });
  }, [permissionsQuery.data, reset]);

  if (permissionsQuery.isPending || !permissionsQuery.data) {
    if (permissionsQuery.isError) {
      return (
        <AppPanel className="bg-white/95">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Permission configuration
            </h1>
            <p className="text-sm leading-6 text-slate-600">Workspace permission policy</p>
            <p className="text-sm leading-6 text-slate-600">Workspace access rules</p>
          </div>

          <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <p className="font-semibold">Permission policy is temporarily unavailable.</p>
            <p className="mt-2">
              Reload after the workspace settings service recovers. Existing project, member, and
              private-access rules stay unchanged until this page can fetch the current policy.
            </p>
          </section>
        </AppPanel>
      );
    }

    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm font-medium text-slate-700">Loading workspace permissions…</p>
      </AppPanel>
    );
  }

  return (
    <AppPanel className="bg-white/95">
      <form
        className="space-y-6"
        onSubmit={handleSubmit(async (values) => {
          setStatus(null);
          setSaveError(null);

          try {
            await updateMutation.mutateAsync({
              workspace: {
                limit_public_project_data: values.limitPublicProjectData,
                only_admins_may_create_projects: values.onlyAdminsMayCreateProjects,
                only_admins_may_create_tags: values.onlyAdminsMayCreateTags,
                only_admins_see_team_dashboard: values.onlyAdminsSeeTeamDashboard,
              },
            });
            setStatus("Permissions saved");
          } catch {
            setSaveError("Unable to save permissions.");
          }
        })}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Permission configuration
          </h1>
          <p className="text-sm leading-6 text-slate-600">Workspace permission policy</p>
          <p className="text-sm leading-6 text-slate-600">
            Workspace access rules
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Keep admin-only creation, dashboard visibility, and public project exposure aligned
            with the current workspace access policy.
          </p>
        </div>

        <div className="space-y-4">
          {permissionFields.map((field) => (
            <label
              className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3"
              key={field.name}
            >
              <input
                aria-label={field.label}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                disabled={updateMutation.isPending}
                type="checkbox"
                {...register(field.name)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-slate-900">{field.label}</span>
                <span className="block text-sm leading-6 text-slate-600">{field.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <AppButton disabled={updateMutation.isPending} type="submit">
            Save permissions
          </AppButton>
          {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
          {saveError ? <p className="text-sm font-medium text-rose-700">{saveError}</p> : null}
        </div>
      </form>
    </AppPanel>
  );
}
