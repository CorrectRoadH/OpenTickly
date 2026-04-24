import { AppButton, AppPanel } from "@opentickly/web-ui";
import { type FormEvent, type ReactElement, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateGroupMutation, useGroupsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function GroupsPage(): ReactElement {
  const { t } = useTranslation("groups");
  const session = useSession();
  const groupsQuery = useGroupsQuery(session.currentWorkspace.id);
  const createGroupMutation = useCreateGroupMutation(session.currentWorkspace.id);
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const groupNameInputRef = useRef<HTMLInputElement | null>(null);

  const groups = normalizeGroups(groupsQuery.data);
  const trimmedGroupName = groupName.trim();

  if (groupsQuery.isPending) {
    return (
      <AppPanel tone="muted">
        <p className="text-sm text-slate-400">{t("loadingGroups")}</p>
      </AppPanel>
    );
  }

  if (groupsQuery.isError) {
    return (
      <AppPanel tone="danger">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{t("groups")}</h1>
          <p className="text-sm leading-6 text-rose-300">{t("unableToLoadGroups")}</p>
        </div>
      </AppPanel>
    );
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedGroupName.length === 0) {
      return;
    }

    await createGroupMutation.mutateAsync(trimmedGroupName);
    setGroupName("");
    setStatus(t("teamCreated"));
  }

  return (
    <AppPanel data-testid="groups-page" tone="muted">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{t("teams")}</h1>
          <p className="text-sm text-slate-500">{t("organizationTeamDirectory")}</p>
          <p className="text-sm leading-6 text-slate-400">{t("teamsDescription")}</p>
        </div>
        <AppButton onClick={() => groupNameInputRef.current?.focus()} type="button">
          {t("createTeam")}
        </AppButton>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        data-testid="groups-create-form"
        onSubmit={handleCreateGroup}
      >
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-300">
          {t("teamName")}
          <input
            ref={groupNameInputRef}
            className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 text-white"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        </label>
        <AppButton
          disabled={trimmedGroupName.length === 0 || createGroupMutation.isPending}
          type="submit"
        >
          {t("save")}
        </AppButton>
        {status ? (
          <p className="text-sm font-medium text-[var(--track-text-accent)]">{status}</p>
        ) : null}
      </form>

      {groups.length > 0 ? (
        <ul
          className="mt-6 divide-y divide-white/8"
          aria-label={t("teamsList")}
          data-testid="groups-list"
        >
          {groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{group.name}</p>
                <p className="text-xs text-slate-400">{t("team")}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section
          className="mt-6 rounded-xl border border-dashed border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-5 py-5 text-sm text-slate-300"
          data-testid="groups-empty-state"
        >
          <p className="font-semibold text-white">{t("noTeamsYet")}</p>
          <p className="mt-2 text-slate-400">{t("noTeamsDescription")}</p>
        </section>
      )}

      <div
        className="mt-6 rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] p-3 text-sm text-slate-300"
        data-testid="groups-summary"
      >
        <p className="font-medium text-white">{t("showingTeams", { count: groups.length })}</p>
      </div>
    </AppPanel>
  );
}

type GroupListItem = {
  id: number;
  name: string;
};

function normalizeGroups(data: unknown): GroupListItem[] {
  if (Array.isArray(data)) {
    return data as GroupListItem[];
  }

  if (hasGroupArray(data, "groups")) {
    return data.groups;
  }

  if (hasGroupArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasGroupArray(
  value: unknown,
  key: "data" | "groups",
): value is Record<typeof key, GroupListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
