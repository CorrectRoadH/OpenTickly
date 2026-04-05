import { Link } from "@tanstack/react-router";
import {
  AppButton,
  Dropdown,
  MenuSeparator,
  SelectButton,
  useDropdownClose,
} from "@opentoggl/web-ui";
import { useEffect, useId, useRef, useState, type ReactElement } from "react";

import type { SessionOrganizationViewModel } from "../../entities/session/session-bootstrap.ts";
import { useCreateOrganizationMutation } from "../../shared/query/web-shell.ts";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { UserAvatar } from "../../shared/ui/UserAvatar.tsx";
import { CheckIcon, ChevronRightIcon, MembersIcon, SettingsIcon } from "../../shared/ui/icons.tsx";

type WorkspaceSwitcherProps = {
  currentOrganization: SessionOrganizationViewModel | null;
  inviteMembersPath?: string;
  managePath?: string;
  onChange: (workspaceId: number) => void;
  onSetDefault?: (workspaceId: number) => Promise<void> | void;
  organizations: SessionOrganizationViewModel[];
};

export function WorkspaceSwitcher({
  currentOrganization,
  inviteMembersPath,
  managePath,
  onChange,
  onSetDefault,
  organizations,
}: WorkspaceSwitcherProps): ReactElement {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [optimisticOrganization, setOptimisticOrganization] =
    useState<SessionOrganizationViewModel | null>(null);
  const [optimisticDefaultWorkspaceId, setOptimisticDefaultWorkspaceId] = useState<number | null>(
    null,
  );
  const [organizationName, setOrganizationName] = useState("");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const createOrganizationMutation = useCreateOrganizationMutation();
  const displayedOrganizations = applyOptimisticDefault(
    mergeOrganizations(organizations, optimisticOrganization),
    optimisticDefaultWorkspaceId,
  );
  const visibleOrganization =
    optimisticOrganization ?? currentOrganization ?? displayedOrganizations[0] ?? null;

  useEffect(() => {
    if (!optimisticOrganization) {
      return;
    }

    if (
      organizations.some((entry) =>
        matchesOrganization(
          entry,
          optimisticOrganization.defaultWorkspaceId,
          optimisticOrganization.name,
        ),
      )
    ) {
      setOptimisticOrganization(null);
    }
  }, [optimisticOrganization, organizations]);

  useEffect(() => {
    if (optimisticDefaultWorkspaceId == null) {
      return;
    }

    if (
      organizations.some(
        (entry) => entry.isDefault && entry.defaultWorkspaceId === optimisticDefaultWorkspaceId,
      )
    ) {
      setOptimisticDefaultWorkspaceId(null);
    }
  }, [optimisticDefaultWorkspaceId, organizations]);

  function handleSelectOrganization(organization: SessionOrganizationViewModel) {
    if (!organization.defaultWorkspaceId) {
      return;
    }

    setOptimisticOrganization(null);
    onChange(organization.defaultWorkspaceId);
    buttonRef.current?.focus();
  }

  async function handleCreateOrganization() {
    const nextOrganizationName = organizationName.trim();

    if (!nextOrganizationName) {
      return;
    }

    const createdOrganization = await createOrganizationMutation.mutateAsync({
      name: nextOrganizationName,
      workspace_name: nextOrganizationName,
    });
    const createdWorkspaceId = createdOrganization.workspace_id ?? 0;

    setCreateDialogOpen(false);
    setOrganizationName("");

    if (createdWorkspaceId > 0) {
      setOptimisticOrganization({
        defaultWorkspaceId: createdWorkspaceId,
        id: -createdWorkspaceId,
        isAdmin: true,
        isDefault: false,
        isCurrent: true,
        isMultiWorkspaceEnabled: true,
        maxWorkspaces: null,
        name: nextOrganizationName,
        userCount: 1,
      });
      onChange(createdWorkspaceId);
    }
  }

  return (
    <div className="relative w-full">
      <span className="sr-only" id={`${listboxId}-label`}>
        Organization
      </span>
      <Dropdown
        panelClassName="w-[min(360px,calc(100vw-2rem))] rounded-[12px] border border-[var(--track-border)] bg-[var(--track-surface)] shadow-[0_18px_48px_var(--track-shadow-elevated)]"
        testId="workspace-switcher-panel"
        trigger={
          <SelectButton
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-labelledby={`${listboxId}-label`}
            ref={buttonRef}
          >
            {visibleOrganization?.name ?? ""}
          </SelectButton>
        }
      >
        <OrganizationOptionsPanel
          inviteMembersPath={inviteMembersPath}
          listboxId={listboxId}
          managePath={managePath}
          onCreateOrganization={() => {
            setCreateDialogOpen(true);
          }}
          onSelectOrganization={handleSelectOrganization}
          onSetDefaultRequested={setOptimisticDefaultWorkspaceId}
          onSetDefault={onSetDefault}
          organization={visibleOrganization}
          organizations={displayedOrganizations}
        />
      </Dropdown>

      {createDialogOpen ? (
        <CreateNameDialog
          isPending={createOrganizationMutation.isPending}
          nameLabel="Organization name"
          testId="create-organization-dialog"
          namePlaceholder="Organization name"
          nameValue={organizationName}
          onClose={() => {
            if (createOrganizationMutation.isPending) {
              return;
            }

            setCreateDialogOpen(false);
            setOrganizationName("");
            buttonRef.current?.focus();
          }}
          onNameChange={setOrganizationName}
          onSubmit={() => {
            void handleCreateOrganization();
          }}
          submitLabel="Create organization"
          title="New organization"
        />
      ) : null}
    </div>
  );
}

function mergeOrganizations(
  organizations: SessionOrganizationViewModel[],
  optimisticOrganization: SessionOrganizationViewModel | null,
): SessionOrganizationViewModel[] {
  if (!optimisticOrganization) {
    return organizations;
  }

  if (
    organizations.some((entry) =>
      matchesOrganization(
        entry,
        optimisticOrganization.defaultWorkspaceId,
        optimisticOrganization.name,
      ),
    )
  ) {
    return organizations;
  }

  return [
    ...organizations.map((entry) => ({
      ...entry,
      isCurrent: false,
    })),
    optimisticOrganization,
  ];
}

function applyOptimisticDefault(
  organizations: SessionOrganizationViewModel[],
  optimisticDefaultWorkspaceId: number | null,
): SessionOrganizationViewModel[] {
  if (optimisticDefaultWorkspaceId == null) {
    return organizations;
  }

  return organizations.map((entry) => ({
    ...entry,
    isDefault: entry.defaultWorkspaceId === optimisticDefaultWorkspaceId,
  }));
}

function matchesOrganization(
  organization: SessionOrganizationViewModel,
  workspaceId: number | null,
  name: string,
): boolean {
  if (workspaceId != null && organization.defaultWorkspaceId === workspaceId) {
    return true;
  }

  return organization.name === name;
}

function OrganizationOptionsPanel({
  inviteMembersPath,
  listboxId,
  managePath,
  onCreateOrganization,
  onSelectOrganization,
  onSetDefaultRequested,
  onSetDefault,
  organization,
  organizations,
}: {
  inviteMembersPath?: string;
  listboxId: string;
  managePath?: string;
  onCreateOrganization: () => void;
  onSelectOrganization: (organization: SessionOrganizationViewModel) => void;
  onSetDefaultRequested: (workspaceId: number | null) => void;
  onSetDefault?: (workspaceId: number) => void;
  organization: SessionOrganizationViewModel | null;
  organizations: SessionOrganizationViewModel[];
}): ReactElement {
  const close = useDropdownClose();
  const memberCount = organization?.userCount ?? 1;

  return (
    <div className="p-2">
      <div className="flex items-center gap-2.5 px-2.5 py-2.5">
        <UserAvatar
          className="size-10 shrink-0 border border-[var(--track-border)] bg-[var(--track-surface-muted)]"
          name={organization?.name ?? "Organization"}
          textClassName="text-[16px] font-semibold"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14px] font-semibold leading-5 text-white">
            {organization?.name ?? ""}
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--track-text-muted)]">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <MenuSeparator />

      <div className="space-y-1 py-1">
        <OrganizationActionLink
          icon={<SettingsIcon className="size-4" />}
          label="Manage"
          muted={!managePath}
          to={managePath}
        />
        <OrganizationActionLink
          icon={<MembersIcon className="size-4" />}
          label="Invite members"
          muted={!inviteMembersPath}
          to={inviteMembersPath}
        />
      </div>

      <div className="px-2.5 py-1">
        <AppButton
          className="w-full justify-center"
          onClick={() => {
            close();
            onCreateOrganization();
          }}
          variant="secondary"
        >
          Create organization
        </AppButton>
      </div>

      <MenuSeparator />

      <div className="px-2.5 pb-2 pt-2">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          Organizations
        </p>
        <ul
          aria-labelledby={`${listboxId}-label`}
          className="mt-1.5 space-y-0.5"
          id={listboxId}
          role="listbox"
        >
          {organizations.map((entry) => {
            const selected = entry.isCurrent;
            const showSetDefault =
              !entry.isDefault && entry.defaultWorkspaceId != null && onSetDefault != null;

            return (
              <li aria-selected={selected} key={entry.id} role="option">
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--track-row-hover)]">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => {
                      close();
                      onSelectOrganization(entry);
                    }}
                    type="button"
                  >
                    <UserAvatar
                      className="size-9 shrink-0 border border-[var(--track-border)] bg-[var(--track-surface-muted)]"
                      name={entry.name}
                      textClassName="text-[14px] font-semibold"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-white">
                        {entry.name}
                      </span>
                    </span>
                  </button>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {entry.isDefault ? (
                      <span className="rounded-full border border-[var(--track-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                        Default
                      </span>
                    ) : null}
                    {showSetDefault ? (
                      <button
                        className="h-6 rounded-[6px] border border-[var(--track-border)] px-2 text-[10px] font-semibold text-[var(--track-text-muted)] transition hover:border-[var(--track-control-border)] hover:bg-[var(--track-row-hover)] hover:text-white"
                        onClick={() => {
                          onSetDefaultRequested(entry.defaultWorkspaceId!);
                          void Promise.resolve(onSetDefault(entry.defaultWorkspaceId!)).catch(
                            () => {
                              onSetDefaultRequested(null);
                            },
                          );
                        }}
                        type="button"
                      >
                        Set default
                      </button>
                    ) : null}
                    {selected ? (
                      <span
                        aria-label="Current organization"
                        className="text-[var(--track-accent)]"
                      >
                        <CheckIcon className="size-4" />
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function OrganizationActionLink({
  icon,
  label,
  muted = false,
  to,
}: {
  icon: ReactElement;
  label: string;
  muted?: boolean;
  to?: string;
}): ReactElement {
  const content = (
    <>
      <span className="flex items-center gap-3">
        <span
          className={muted ? "text-[var(--track-text-soft)]" : "text-[var(--track-text-muted)]"}
        >
          {icon}
        </span>
        <span>{label}</span>
      </span>
      {!muted ? <ChevronRightIcon className="size-4 text-[var(--track-text-muted)]" /> : null}
    </>
  );

  const className = `flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[14px] font-medium transition ${
    muted
      ? "cursor-default text-[var(--track-text-soft)]"
      : "text-white hover:bg-[var(--track-row-hover)]"
  }`;

  if (!to || muted) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} to={to}>
      {content}
    </Link>
  );
}
