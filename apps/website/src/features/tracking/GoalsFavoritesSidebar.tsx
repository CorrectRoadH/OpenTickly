import type { ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  HandlergoalsApiResponse,
  ModelsFavorite,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { ChevronRightIcon, PlayIcon, PlusIcon } from "../../shared/ui/icons.tsx";

type GoalsFavoritesSidebarProps = {
  favorites: ModelsFavorite[];
  goals: HandlergoalsApiResponse[];
  onDeleteFavorite?: (favoriteId: number) => void;
  onStartFavorite?: (favorite: ModelsFavorite) => void;
  workspaceId: number;
};

export function GoalsFavoritesSidebar({
  favorites,
  goals,
  onDeleteFavorite,
  onStartFavorite,
  workspaceId,
}: GoalsFavoritesSidebarProps): ReactElement {
  const { t } = useTranslation("goals");

  return (
    <div
      className="sticky top-[var(--timer-header-height,0px)] flex h-fit max-h-[calc(100vh-var(--timer-header-height,0px))] w-[220px] shrink-0 flex-col overflow-y-auto border-l border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="goals-favorites-sidebar"
    >
      <SidebarSection
        title={t("sidebarGoals")}
        action={
          <Link
            aria-label={t("addGoals")}
            className="flex size-5 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
            to="/workspaces/$workspaceId/goals"
            params={{ workspaceId: String(workspaceId) }}
          >
            <PlusIcon className="size-3" />
          </Link>
        }
      >
        {goals.length === 0 ? (
          <div className="px-4 pb-3 text-[12px] text-[var(--track-text-muted)]">
            {t("noGoalsYetSidebar")}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-2 pb-2">
            {goals.map((goal) => (
              <GoalItem key={goal.goal_id} goal={goal} />
            ))}
          </div>
        )}
      </SidebarSection>
      <SidebarSection title={t("favorites")}>
        {favorites.length === 0 ? (
          <div className="px-4 pb-3 text-[12px] text-[var(--track-text-muted)]">
            {t("noFavoritesYet")}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-2 pb-2">
            {favorites.map((fav) => (
              <FavoriteItem
                favorite={fav}
                key={fav.favorite_id}
                onDelete={onDeleteFavorite}
                onStart={onStartFavorite}
              />
            ))}
          </div>
        )}
      </SidebarSection>
    </div>
  );
}

function SidebarSection({
  action,
  children,
  title,
}: {
  action?: ReactElement;
  children: ReactElement | ReactElement[];
  title: string;
}): ReactElement {
  return (
    <details className="group" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[12px] font-medium text-white select-none">
        <ChevronRightIcon className="size-3 text-[var(--track-text-muted)] transition group-open:rotate-90" />
        <span className="flex-1">{title}</span>
        {action ? <span onClick={(e) => e.stopPropagation()}>{action}</span> : null}
      </summary>
      {children}
    </details>
  );
}

export function GoalItem({ goal }: { goal: HandlergoalsApiResponse }): ReactElement {
  const { t } = useTranslation("goals");
  const trackedH = Math.round(((goal.current_recurrence_tracked_seconds ?? 0) / 3600) * 10) / 10;
  const targetH = Math.round(((goal.target_seconds ?? 0) / 3600) * 10) / 10;
  const progress = targetH > 0 ? Math.min((trackedH / targetH) * 100, 100) : 0;
  const isLimit = goal.comparison === "less_than" || goal.comparison === "lte";
  const ringColor = isLimit ? "var(--track-warning)" : "var(--track-accent)";

  return (
    <div
      className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 transition hover:bg-[var(--track-row-hover)]"
      data-testid={`goal-item-${goal.goal_id}`}
    >
      <div className="relative flex size-8 shrink-0 items-center justify-center">
        <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" fill="none" r="13" stroke="var(--track-border)" strokeWidth="3" />
          <circle
            cx="16"
            cy="16"
            data-testid="goal-progress-ring"
            fill="none"
            r="13"
            stroke={ringColor}
            strokeDasharray={`${(progress / 100) * 81.68} 81.68`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <span className="absolute text-[10px]">{goal.icon ?? "🎯"}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1 truncate text-[12px] leading-tight text-white">
          {goal.name ?? t("untitledGoal")}
          <span data-comparison={goal.comparison} data-testid="goal-comparison-indicator">
            {isLimit ? (
              <svg
                data-direction="down"
                className="size-3 text-[var(--track-warning)]"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 2v8M3 7l3 3 3-3" />
              </svg>
            ) : (
              <svg
                data-direction="up"
                className="size-3 text-[var(--track-accent)]"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 10V2M3 5l3-3 3 3" />
              </svg>
            )}
          </span>
        </span>
        <span className="text-[11px] leading-tight text-[var(--track-text-muted)]">
          {t("hoursProgress", { tracked: trackedH, target: targetH })}
          {(goal.streak ?? 0) > 0 ? ` ${t("streakFire", { streak: goal.streak })}` : ""}
        </span>
      </div>
    </div>
  );
}

function FavoriteItem({
  favorite,
  onDelete,
  onStart,
}: {
  favorite: ModelsFavorite;
  onDelete?: (favoriteId: number) => void;
  onStart?: (favorite: ModelsFavorite) => void;
}): ReactElement {
  const { t } = useTranslation("goals");
  const label = favorite.description?.trim() || favorite.project_name || t("untitled");
  const projectColor = favorite.project_color;

  return (
    <div
      className="group flex items-center gap-2 rounded-[6px] px-2 py-1.5 transition hover:bg-[var(--track-row-hover)]"
      data-testid={`favorite-item-${favorite.favorite_id}`}
    >
      <button
        aria-label={`${t("continue")} ${label}`}
        className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:text-[var(--track-accent)]"
        onClick={() => onStart?.(favorite)}
        type="button"
      >
        <PlayIcon className="size-3" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12px] leading-tight text-white">{label}</span>
        {favorite.project_name && favorite.description?.trim() ? (
          <span className="flex items-center gap-1 truncate text-[11px] leading-tight text-[var(--track-text-muted)]">
            {projectColor ? (
              <span
                className="inline-block size-[6px] shrink-0 rounded-full"
                style={{ backgroundColor: projectColor }}
              />
            ) : null}
            {favorite.project_name}
          </span>
        ) : null}
      </div>
      <button
        aria-label={`${t("delete")} ${label}`}
        className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] opacity-0 transition hover:text-[var(--track-danger-text)] group-hover:opacity-100"
        onClick={() => {
          if (typeof favorite.favorite_id === "number") {
            onDelete?.(favorite.favorite_id);
          }
        }}
        type="button"
      >
        <X aria-hidden="true" className="size-[10px]" size={10} strokeWidth={1.5} />
      </button>
    </div>
  );
}
