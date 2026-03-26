import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";

import { TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";

export type ProjectEditorMember = {
  email?: string;
  id: number;
  name: string;
};

type ProjectEditorDialogProps = {
  color: string;
  isPending?: boolean;
  isPrivate: boolean;
  memberRole: "manager" | "regular";
  members: ProjectEditorMember[];
  name: string;
  onClose: () => void;
  onColorChange: (value: string) => void;
  onMemberRoleChange: (value: "manager" | "regular") => void;
  onNameChange: (value: string) => void;
  onPrivacyChange: (value: boolean) => void;
  onSubmit: () => void;
  onTemplateChange: (value: boolean) => void;
  onToggleMember: (memberId: number) => void;
  selectedMemberIds: number[];
  submitLabel: string;
  template: boolean;
  title: string;
};

export function ProjectEditorDialog({
  color,
  isPending = false,
  isPrivate,
  memberRole,
  members,
  name,
  onClose,
  onColorChange,
  onMemberRoleChange,
  onNameChange,
  onPrivacyChange,
  onSubmit,
  onTemplateChange,
  onToggleMember,
  selectedMemberIds,
  submitLabel,
  template,
  title,
}: ProjectEditorDialogProps): ReactElement {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const trimmedName = name.trim();
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) {
      return members;
    }

    return members.filter((member) => {
      const haystack = `${member.name} ${member.email ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [memberQuery, members]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) {
      return;
    }
    onSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/55 px-4 py-10"
      data-testid="project-editor-dialog-overlay"
      onClick={onClose}
    >
      <form
        aria-labelledby="project-editor-title"
        aria-modal="true"
        className="w-full max-w-[620px] rounded-[14px] border border-[#3f3f44] bg-[#1f1f20] px-5 pb-5 pt-4 shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
        data-testid="project-editor-dialog"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-medium text-white" id="project-editor-title">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="text-[20px] leading-none text-[var(--track-text-muted)] transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Project name
            </span>
            <input
              aria-label="Project name"
              className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[#262628] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Project name"
              value={name}
            />
            {!trimmedName ? (
              <span className="mt-2 block text-[12px] text-[#ff9f8f]">
                Please enter a Project name
              </span>
            ) : null}
          </label>

          <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  Privacy
                </p>
                <p className="mt-2 text-[14px] text-white">
                  Private, visible only to project members
                </p>
              </div>
              <button
                aria-label="Private, visible only to project members"
                aria-pressed={isPrivate}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  isPrivate ? "bg-[var(--track-accent-soft)]" : "bg-[#3a3a3d]"
                }`}
                onClick={() => onPrivacyChange(!isPrivate)}
                type="button"
              >
                <span
                  className={`inline-block size-5 rounded-full bg-white transition ${
                    isPrivate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                  Manage project members
                </p>
                <p className="mt-2 text-[14px] text-white">Invite members</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#d4d4d9]">
                <span>Access</span>
                <select
                  aria-label="Member access"
                  className="h-9 rounded-md border border-[var(--track-border)] bg-[#262628] px-3 text-[13px] text-white"
                  onChange={(event) =>
                    onMemberRoleChange(event.target.value === "manager" ? "manager" : "regular")
                  }
                  value={memberRole}
                >
                  <option value="regular">Regular member</option>
                  <option value="manager">Project manager</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="sr-only">Invite members</span>
              <input
                aria-label="Invite members"
                className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[#262628] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMemberQuery(event.target.value)
                }
                placeholder="Type a name or email to invite"
                value={memberQuery}
              />
            </label>

            <div className="mt-4 max-h-[180px] space-y-2 overflow-y-auto pr-1">
              {filteredMembers.map((member) => {
                const selected = selectedMemberIds.includes(member.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left transition ${
                      selected
                        ? "border-[var(--track-accent-soft)] bg-[var(--track-accent-soft)]/10 text-white"
                        : "border-transparent bg-[#232325] text-[#d0d0d4] hover:border-white/10"
                    }`}
                    key={member.id}
                    onClick={() => onToggleMember(member.id)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium">{member.name}</div>
                      <div className="truncate text-[12px] text-[var(--track-text-muted)]">
                        {member.email ?? "Workspace member"}
                      </div>
                    </div>
                    <span className="text-[12px]">{selected ? "Added" : "Add"}</span>
                  </button>
                );
              })}
              {filteredMembers.length === 0 ? (
                <p className="rounded-[10px] bg-[#232325] px-3 py-3 text-[13px] text-[var(--track-text-muted)]">
                  No matching workspace members.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[12px] border border-[var(--track-border)] bg-[#181818]">
            <button
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setAdvancedOpen((current) => !current)}
              type="button"
            >
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                Advanced options
              </span>
              <span className="text-[18px] text-white">{advancedOpen ? "−" : "+"}</span>
            </button>
            {advancedOpen ? (
              <div className="border-t border-[var(--track-border)] px-4 pb-4 pt-4">
                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                    Color
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {TRACK_COLOR_SWATCHES.map((option) => (
                      <button
                        aria-label={`Select color ${option}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                          color === option
                            ? "border-white/80 bg-white/8"
                            : "border-transparent hover:border-white/25"
                        }`}
                        key={option}
                        onClick={() => onColorChange(option)}
                        type="button"
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-black/20"
                          style={{ backgroundColor: option }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <label className="mt-4 flex items-center justify-between rounded-[10px] border border-[var(--track-border)] bg-[#232325] px-3 py-3">
                  <span className="text-[14px] text-white">Use as template</span>
                  <input
                    aria-label="Use as template"
                    checked={template}
                    className="size-4"
                    onChange={(event) => onTemplateChange(event.target.checked)}
                    type="checkbox"
                  />
                </label>
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="flex h-9 items-center rounded-md border border-[var(--track-border)] px-4 text-[12px] text-[var(--track-text-muted)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-9 items-center rounded-md bg-[var(--track-button)] px-4 text-[12px] font-medium text-black disabled:opacity-60"
            disabled={isPending || !trimmedName}
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
