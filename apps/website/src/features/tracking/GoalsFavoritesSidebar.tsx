import type { ReactElement } from "react";

import type { ModelsFavorite } from "../../shared/api/generated/public-track/types.gen.ts";
import { ChevronRightIcon, PlayIcon, PlusIcon } from "../../shared/ui/icons.tsx";

type GoalsFavoritesSidebarProps = {
  favorites: ModelsFavorite[];
  onDeleteFavorite?: (favoriteId: number) => void;
  onStartFavorite?: (favorite: ModelsFavorite) => void;
};

export function GoalsFavoritesSidebar({
  favorites,
  onDeleteFavorite,
  onStartFavorite,
}: GoalsFavoritesSidebarProps): ReactElement {
  return (
    <div
      className="flex w-[220px] shrink-0 flex-col border-l border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="goals-favorites-sidebar"
    >
      <SidebarSection title="Goals">
        <div className="px-4 pb-3 text-[12px] text-[var(--track-text-muted)]">No goals yet</div>
      </SidebarSection>
      <SidebarSection title="Favorites">
        {favorites.length === 0 ? (
          <div className="px-4 pb-3 text-[12px] text-[var(--track-text-muted)]">
            No favorites yet
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-2 pb-2">
            {favorites.map((fav) => (
              <FavoriteItem
                key={fav.favorite_id}
                favorite={fav}
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
  children,
  title,
}: {
  children: ReactElement | ReactElement[];
  title: string;
}): ReactElement {
  return (
    <details className="group" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[13px] font-medium text-white select-none">
        <ChevronRightIcon className="size-3 text-[var(--track-text-muted)] transition group-open:rotate-90" />
        <span className="flex-1">{title}</span>
        <button
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex size-5 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          onClick={(e) => e.stopPropagation()}
          type="button"
        >
          <PlusIcon className="size-3" />
        </button>
      </summary>
      {children}
    </details>
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
  const label = favorite.description?.trim() || favorite.project_name || "Untitled";
  const projectColor = favorite.project_color;

  return (
    <div
      className="group flex items-center gap-2 rounded-[6px] px-2 py-1.5 transition hover:bg-[var(--track-row-hover)]"
      data-testid={`favorite-item-${favorite.favorite_id}`}
    >
      <button
        aria-label={`Start ${label}`}
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
        aria-label={`Delete favorite ${label}`}
        className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] opacity-0 transition hover:text-[var(--track-danger-text)] group-hover:opacity-100"
        onClick={() => {
          if (typeof favorite.favorite_id === "number") {
            onDelete?.(favorite.favorite_id);
          }
        }}
        type="button"
      >
        <svg className="size-[10px]" fill="none" viewBox="0 0 7 7">
          <path
            d="M.5.5l6 6m0-6l-6 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>
      </button>
    </div>
  );
}
