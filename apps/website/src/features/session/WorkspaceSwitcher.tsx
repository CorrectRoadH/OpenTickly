import { Link } from "@tanstack/react-router";
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
import { TrackingIcon } from "../tracking/tracking-icons.tsx";

type WorkspaceSwitcherProps = {
  currentOrganization: SessionOrganizationViewModel | null;
  inviteMembersPath?: string;
  managePath?: string;
  onChange: (workspaceId: number) => void;
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
  organizations,
}: WorkspaceSwitcherProps): ReactElement {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [panelPosition, setPanelPosition] = useState<FloatingPanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null!);
  const listboxId = useId();
  const createOrganizationMutation = useCreateOrganizationMutation();
  const visibleOrganization = currentOrganization ?? organizations[0] ?? null;

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

    onChange(organization.defaultWorkspaceId);
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  async function handleCreateOrganization() {
    if (!organizationName.trim()) {
      return;
    }

    const createdOrganization = await createOrganizationMutation.mutateAsync({
      name: organizationName.trim(),
      workspace_name: organizationName.trim(),
    });
    const createdWorkspaceId = createdOrganization.workspace_id ?? 0;

    setCreateDialogOpen(false);
    setOrganizationName("");

    if (createdWorkspaceId > 0) {
      onChange(createdWorkspaceId);
    }
  }

  return (
    <div className="relative w-full" ref={rootRef}>
      <span className="sr-only" id={`${listboxId}-label`}>
        Organization
      </span>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${listboxId}-label`}
        className={`flex h-10 w-full items-center gap-2 rounded-[14px] border px-3 text-left text-white outline-none transition ${
          isOpen
            ? "border-[#5a4a57] bg-[#3a3a3a]"
            : "border-[#4a4a4a] bg-[#3a3a3a] hover:bg-[#444444] focus-visible:border-[#6a325e]"
        }`}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold text-white">
          {visibleOrganization?.name ?? ""}
        </span>
        <span className={`shrink-0 transition ${isOpen ? "text-white" : "text-[#cfcfcf]"}`}>
          <TrackingIcon
            className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
            name="chevron-down"
          />
        </span>
      </button>

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
              organization={visibleOrganization}
              organizations={organizations}
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

function OrganizationOptionsPanel({
  inviteMembersPath,
  listboxId,
  managePath,
  onCreateOrganization,
  onSelectOrganization,
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
  organization: SessionOrganizationViewModel | null;
  organizations: SessionOrganizationViewModel[];
  panelPosition: FloatingPanelPosition;
  panelRef: MutableRefObject<HTMLDivElement | null>;
}): ReactElement {
  const planName = organization?.planName ? `${organization.planName} plan` : "Free plan";
  const memberCount = organization?.userCount ?? 1;

  return (
    <div
      className="fixed z-50 rounded-[18px] border border-[#4a4a4a] bg-[#1f1f1f] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.48)]"
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
          <div className="flex size-[74px] items-center justify-center rounded-full border border-[#4a4a4a] text-[#7f7f7f]">
            <TrackingIcon className="size-8" name="overview" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[18px] font-semibold text-white">
              {organization?.name ?? ""}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {managePath ? (
            <Link
              className="flex h-16 items-center justify-center gap-3 rounded-[14px] border border-[#5a5a5a] text-[16px] font-semibold text-white transition hover:bg-[#2a2a2a]"
              to={managePath}
            >
              <TrackingIcon className="size-5" name="settings" />
              <span>Manage</span>
            </Link>
          ) : (
            <div className="flex h-16 items-center justify-center gap-3 rounded-[14px] border border-[#5a5a5a] text-[16px] font-semibold text-[#8e8e8e]">
              <TrackingIcon className="size-5" name="settings" />
              <span>Manage</span>
            </div>
          )}

          {inviteMembersPath ? (
            <Link
              className="flex h-16 items-center justify-center gap-3 rounded-[14px] border border-[#5a5a5a] text-[16px] font-semibold text-white transition hover:bg-[#2a2a2a]"
              to={inviteMembersPath}
            >
              <TrackingIcon className="size-5" name="members" />
              <span>Invite members</span>
            </Link>
          ) : (
            <div className="flex h-16 items-center justify-center gap-3 rounded-[14px] border border-[#5a5a5a] text-[16px] font-semibold text-[#8e8e8e]">
              <TrackingIcon className="size-5" name="members" />
              <span>Invite members</span>
            </div>
          )}
        </div>

        <div className="border-t border-[#4a4a4a] pt-5 text-[14px] leading-7 text-[#c8c8c8]">
          Your organization is currently on {planName} with {memberCount} member
          {memberCount === 1 ? "" : "s"}.
        </div>

        <div className="border-t border-[#4a4a4a] pt-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">
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

              return (
                <li aria-selected={selected} key={entry.id} role="option">
                  <button
                    className="flex w-full items-center gap-4 rounded-[12px] px-2 py-3 text-left transition hover:bg-[#2b2b2b]"
                    onClick={() => {
                      onSelectOrganization(entry);
                    }}
                    type="button"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center text-[#7f7f7f]">
                      <TrackingIcon className="size-5" name="overview" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-white">
                      {entry.name}
                    </span>
                    {selected ? (
                      <>
                        <span className="rounded-full border border-[#5a5a5a] px-3 py-1 text-[12px] font-semibold text-[#d8d8d8]">
                          Default
                        </span>
                        <span className="text-[#d98ad0]">
                          <TrackingIcon className="size-4" name="chevron-down" />
                        </span>
                      </>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-[#4a4a4a] pt-5">
          <button
            className="text-[18px] font-semibold text-white transition hover:text-[#f0d8eb]"
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
