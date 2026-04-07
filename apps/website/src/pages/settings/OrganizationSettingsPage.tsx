import {
  AppButton,
  AppSurfaceState,
  PageLayout,
  SurfaceCard,
  pageLayoutTabClass,
} from "@opentoggl/web-ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PreferenceCard } from "../profile/ProfilePagePrimitives.tsx";
import { GroupsSection } from "../groups/GroupsSection.tsx";
import { OrganizationMembersSection } from "../../features/settings/OrganizationMembersSection.tsx";
import {
  createOrganizationSettingsFormValues,
  mapOrganizationSettingsFormToRequest,
  type OrganizationSettingsFormValues,
} from "../../shared/forms/settings-form.ts";
import {
  useDeleteOrganizationMutation,
  useOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "../../shared/query/web-shell.ts";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";
import { buildOrganizationSettingsPathWithSection } from "../../shared/lib/workspace-routing.ts";
import type { OrganizationSettingsSection } from "../../shared/url-state/organization-settings-location.ts";

type OrganizationSettingsPageProps = {
  organizationId: number;
  section: OrganizationSettingsSection;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 text-sm text-white outline-none transition focus:border-[var(--track-accent)]";

const settingsTabs: Array<{ id: OrganizationSettingsSection; labelKey: string }> = [
  { id: "general", labelKey: "organizationGeneral" },
  { id: "members", labelKey: "organizationMembers" },
  { id: "groups", labelKey: "organizationGroups" },
  { id: "danger", labelKey: "organizationDanger" },
];

export function OrganizationSettingsPage({
  organizationId,
  section,
}: OrganizationSettingsPageProps): ReactElement {
  const { t } = useTranslation("settings");
  const organizationQuery = useOrganizationSettingsQuery(organizationId);

  return (
    <PageLayout
      data-testid="organization-settings-page"
      title={t("organizationSettings")}
      tabs={settingsTabs.map((tab) => (
        <Link
          className={pageLayoutTabClass(section === tab.id)}
          key={tab.id}
          to={buildOrganizationSettingsPathWithSection(organizationId, tab.id)}
        >
          {t(tab.labelKey)}
          {section === tab.id ? (
            <AnimatedActiveIndicator
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]"
              layoutId="org-settings-tab-indicator"
            />
          ) : null}
        </Link>
      ))}
    >
      <div className="px-5 pb-10 pt-5">
        {organizationQuery.isPending ? (
          <SettingsState
            description={t("organizationSettingsUnavailableDescription")}
            title={t("organizationSettings")}
            tone="loading"
          />
        ) : null}

        {organizationQuery.isError ? (
          <SettingsState
            description={t("organizationSettingsUnavailableDescription")}
            title={t("organizationSettingsUnavailable")}
            tone="error"
          />
        ) : null}

        {!organizationQuery.isPending && !organizationQuery.isError && !organizationQuery.data ? (
          <SettingsState
            description={t("organizationSettingsNoData")}
            title={t("organizationSettingsUnavailable")}
            tone="empty"
          />
        ) : null}

        {organizationQuery.data ? (
          <OrganizationSectionContent
            organizationId={organizationId}
            organizationData={organizationQuery.data}
            section={section}
            t={t}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}

function OrganizationSectionContent({
  organizationId,
  organizationData,
  section,
  t,
}: {
  organizationId: number;
  organizationData: Parameters<typeof createOrganizationSettingsFormValues>[0];
  section: OrganizationSettingsSection;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ReactElement {
  switch (section) {
    case "general":
      return (
        <GeneralSection organizationId={organizationId} organizationData={organizationData} t={t} />
      );
    case "members":
      return <OrganizationMembersSection organizationId={organizationId} />;
    case "groups":
      return <GroupsSection organizationId={organizationId} />;
    case "danger":
      return (
        <DangerSection organizationData={organizationData} organizationId={organizationId} t={t} />
      );
    default:
      return (
        <SettingsState description={t("noConfigurableSettings")} title="Section" tone="empty" />
      );
  }
}

function GeneralSection({
  organizationId,
  organizationData,
  t,
}: {
  organizationId: number;
  organizationData: Parameters<typeof createOrganizationSettingsFormValues>[0];
  t: (key: string) => string;
}): ReactElement {
  const updateMutation = useUpdateOrganizationSettingsMutation(organizationId);

  return (
    <div className="w-full space-y-4 md:max-w-[1352px]">
      <OrganizationNameSection
        initialValues={createOrganizationSettingsFormValues(organizationData)}
        onSubmit={async (request) => {
          try {
            await updateMutation.mutateAsync(request);
            toast.success(t("organizationSaved"));
          } catch {
            toast.error(t("couldNotSaveOrganizationSettings"));
          }
        }}
        t={t}
      />

      <PreferenceCard title={t("organizationOverview")}>
        <div className="px-5 py-4">
          <dl className="space-y-0">
            <OverviewRow label={t("members")} value={String(organizationData.user_count ?? 0)} />
            <OverviewRow
              label={t("multiWorkspace")}
              value={organizationData.is_multi_workspace_enabled ? t("enabled") : t("disabled")}
            />
            <OverviewRow
              label={t("maxWorkspaces")}
              value={String(organizationData.max_workspaces ?? 0)}
            />
          </dl>
        </div>
      </PreferenceCard>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center py-1">
      <dt className="min-w-[160px] text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
        {label}
      </dt>
      <dd className="text-[14px] font-medium leading-5 text-white">{value}</dd>
    </div>
  );
}

function OrganizationNameSection({
  initialValues,
  onSubmit,
  t,
}: {
  initialValues: OrganizationSettingsFormValues;
  onSubmit: (request: ReturnType<typeof mapOrganizationSettingsFormToRequest>) => Promise<void>;
  t: (key: string) => string;
}): ReactElement {
  const form = useForm<OrganizationSettingsFormValues>({
    defaultValues: initialValues,
  });

  return (
    <PreferenceCard
      action={
        <AppButton
          disabled={!form.formState.isDirty}
          onClick={form.handleSubmit(async (values) => {
            await onSubmit(mapOrganizationSettingsFormToRequest(values));
            form.reset(values);
          })}
          type="button"
        >
          Save
        </AppButton>
      }
      description={t("changeOrganizationName")}
      title={t("organizationGeneral")}
    >
      <div className="px-5 py-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text-muted)]">
            {t("organizationName")}
          </span>
          <input className={`mt-2 ${fieldClassName}`} {...form.register("name")} />
        </label>
      </div>
    </PreferenceCard>
  );
}

function DangerSection({
  organizationData,
  organizationId,
  t,
}: {
  organizationData: { name?: string | null };
  organizationId: number;
  t: (key: string) => string;
}): ReactElement {
  const navigate = useNavigate();
  const deleteMutation = useDeleteOrganizationMutation(organizationId);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const orgName = organizationData.name ?? "";

  return (
    <div className="w-full md:max-w-[1352px]">
      <PreferenceCard title={t("organizationDanger")}>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-red-400">{t("deleteOrganization")}</h3>
            <p className="text-sm leading-6 text-[var(--track-text-muted)]">
              {t("deleteOrganizationDescription")}
            </p>
          </div>
          <label className="block">
            <span className="text-sm text-[var(--track-text-muted)]">
              Type <span className="font-mono font-semibold text-white">{orgName}</span> to confirm
            </span>
            <input
              className={`mt-2 ${fieldClassName} focus:border-red-500`}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={orgName}
              type="text"
              value={deleteConfirmation}
            />
          </label>
          <button
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
            disabled={deleteConfirmation !== orgName || deleteMutation.isPending}
            onClick={async () => {
              try {
                await deleteMutation.mutateAsync();
                void navigate({ to: "/" });
              } catch {
                toast.error(t("couldNotDeleteOrganization"));
              }
            }}
            type="button"
          >
            {deleteMutation.isPending ? t("deleting") : t("deleteThisOrganization")}
          </button>
        </div>
      </PreferenceCard>
    </div>
  );
}

function SettingsState(props: {
  description: string;
  title: string;
  tone: "empty" | "error" | "loading";
}): ReactElement {
  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={props.description}
        title={props.title}
        tone={props.tone}
      />
    </SurfaceCard>
  );
}
