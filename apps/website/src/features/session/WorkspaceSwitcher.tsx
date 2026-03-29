import { Link } from "@tanstack/react-router";
import { SelectButton } from "@opentoggl/web-ui";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

import type { SessionOrganizationViewModel } from "../../entities/session/session-bootstrap.ts";
import { useCreateOrganizationMutation } from "../../shared/query/web-shell.ts";
import { CreateNameDialog } from "../../shared/ui/CreateNameDialog.tsx";
import { CheckIcon, MembersIcon, OverviewIcon, SettingsIcon } from "../../shared/ui/icons.tsx";

type WorkspaceSwitcherProps = {
  currentOrganization: SessionOrganizationViewModel | null;
  inviteMembersPath?: string;
  managePath?: string;
  onChange: (workspaceId: number) => void;
  onSetDefault?: (workspaceId: number) => Promise<void> | void;
  organizations: SessionOrganizationViewModel[];
};

type FloatingPanelPosition = {
  left: number;
  top: number;
  width: number;
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
  const [isOpen, setIsOpen] = useState(false);
  const [optimisticOrganization, setOptimisticOrganization] =
    useState<SessionOrganizationViewModel | null>(null);
  const [optimisticDefaultWorkspaceId, setOptimisticDefaultWorkspaceId] = useState<number | null>(
    null,
  );
  const [organizationName, setOrganizationName] = useState("");
  const [panelPosition, setPanelPosition] = useState<FloatingPanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null!);
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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);

        if (!createDialogOpen) {
          buttonRef.current?.focus();
        }
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [createDialogOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return;
    }

    function updatePanelPosition() {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const width = Math.min(620, Math.max(rect.width + 304, 360));
      const maxLeft = Math.max(16, window.innerWidth - width - 16);

      setPanelPosition({
        left: Math.min(rect.left, maxLeft),
        top: rect.bottom + 10,
        width,
      });
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function handleSelectOrganization(organization: SessionOrganizationViewModel) {
    if (!organization.defaultWorkspaceId) {
      return;
    }

    setOptimisticOrganization(null);
    onChange(organization.defaultWorkspaceId);
    setIsOpen(false);
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
        planName: visibleOrganization?.planName ?? "Free",
        userCount: 1,
      });
      onChange(createdWorkspaceId);
    }
  }

  return (
    <div className="relative w-full" ref={rootRef}>
      <span className="sr-only" id={`${listboxId}-label`}>
        Organization
      </span>
      <SelectButton
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${listboxId}-label`}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
      >
        {visibleOrganization?.name ?? ""}
      </SelectButton>

      {isOpen && panelPosition
        ? createPortal(
            <OrganizationOptionsPanel
              inviteMembersPath={inviteMembersPath}
              listboxId={listboxId}
              managePath={managePath}
              onCreateOrganization={() => {
                setIsOpen(false);
                setCreateDialogOpen(true);
              }}
              onSelectOrganization={handleSelectOrganization}
              onSetDefaultRequested={setOptimisticDefaultWorkspaceId}
              onSetDefault={onSetDefault}
              organization={visibleOrganization}
              organizations={displayedOrganizations}
              panelPosition={panelPosition}
              panelRef={panelRef}
            />,
            document.body,
          )
        : null}

      {createDialogOpen ? (
        <CreateNameDialog
          isPending={createOrganizationMutation.isPending}
          nameLabel="Organization name"
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
  panelPosition,
  panelRef,
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
  panelPosition: FloatingPanelPosition;
  panelRef: MutableRefObject<HTMLDivElement | null>;
}): ReactElement {
  const planName = organization?.planName ? `${organization.planName} plan` : "Free plan";
  const memberCount = organization?.userCount ?? 1;
  const [hoveredOrganizationId, setHoveredOrganizationId] = useState<number | null>(null);

  return (
    <div
      className="fixed z-50 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-5 shadow-[0_18px_48px_var(--track-shadow-elevated)]"
      ref={(node) => {
        panelRef.current = node;
      }}
      style={{
        left: panelPosition.left,
        top: panelPosition.top,
        width: panelPosition.width,
      }}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-5">
          <div className="flex size-[74px] items-center justify-center rounded-full border border-[var(--track-border)] text-[var(--track-text-soft)]">
            <OverviewIcon className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[14px] font-semibold leading-[23px] text-white">
              {organization?.name ?? ""}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {managePath ? (
            <Link
              className="flex h-12 items-center justify-center gap-3 rounded-[8px] border border-[var(--track-border)] text-[14px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
              to={managePath}
            >
              <SettingsIcon className="size-5" />
              <span>Manage</span>
            </Link>
          ) : (
            <div className="flex h-12 items-center justify-center gap-3 rounded-[8px] border border-[var(--track-border)] text-[14px] font-semibold text-[var(--track-text-soft)]">
              <SettingsIcon className="size-5" />
              <span>Manage</span>
            </div>
          )}

          {inviteMembersPath ? (
            <Link
              className="flex h-12 items-center justify-center gap-3 rounded-[8px] border border-[var(--track-border)] text-[14px] font-semibold text-white transition hover:bg-[var(--track-row-hover)]"
              to={inviteMembersPath}
            >
              <MembersIcon className="size-5" />
              <span>Invite members</span>
            </Link>
          ) : (
            <div className="flex h-12 items-center justify-center gap-3 rounded-[8px] border border-[var(--track-border)] text-[14px] font-semibold text-[var(--track-text-soft)]">
              <MembersIcon className="size-5" />
              <span>Invite members</span>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--track-border)] pt-5 text-[14px] leading-6 text-[var(--track-text-muted)]">
          Your organization is currently on {planName} with {memberCount} member
          {memberCount === 1 ? "" : "s"}.
        </div>

        <div className="border-t border-[var(--track-border)] pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            Organizations
          </p>
          <ul
            aria-labelledby={`${listboxId}-label`}
            className="mt-4 space-y-2"
            id={listboxId}
            role="listbox"
          >
            {organizations.map((entry) => {
              const selected = entry.isCurrent;
              const showSetDefault =
                !entry.isDefault && entry.defaultWorkspaceId != null && onSetDefault != null;

              return (
                <li aria-selected={selected} key={entry.id} role="option">
                  <div
                    className="flex items-center gap-3 rounded-[8px] px-2 py-3 transition hover:bg-[var(--track-row-hover)]"
                    onMouseEnter={() => {
                      setHoveredOrganizationId(entry.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredOrganizationId((current) =>
                        current === entry.id ? null : current,
                      );
                    }}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      onClick={() => {
                        onSelectOrganization(entry);
                      }}
                      type="button"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center text-[var(--track-text-soft)]">
                        <OverviewIcon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
                        {entry.name}
                      </span>
                    </button>
                    <div className="ml-auto flex shrink-0 items-center gap-3">
                      {entry.isDefault ? (
                        <span className="rounded-full border border-[var(--track-border)] px-3 py-1 text-[11px] font-semibold text-[var(--track-text-muted)]">
                          Default
                        </span>
                      ) : null}
                      {showSetDefault && hoveredOrganizationId === entry.id ? (
                        <button
                          aria-label={`Set to default ${entry.name}`}
                          className="text-[12px] font-semibold text-[var(--track-accent)] transition hover:text-white"
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
                          Set to default
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

        <div className="border-t border-[var(--track-border)] pt-5">
          <button
            className="text-[14px] font-semibold leading-[23px] text-white transition hover:text-[var(--track-accent-text)]"
            onClick={onCreateOrganization}
            type="button"
          >
            Create organization
          </button>
        </div>
      </div>
    </div>
  );
}
