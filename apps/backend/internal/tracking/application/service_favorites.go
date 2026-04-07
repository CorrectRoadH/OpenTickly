package application

import (
	"context"
	"strings"

	"github.com/samber/lo"
)

func (service *Service) ListFavorites(ctx context.Context, workspaceID int64, userID int64) ([]FavoriteView, error) {
	favorites, err := service.store.ListFavorites(ctx, workspaceID, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list favorites",
			"workspace_id", workspaceID,
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}
	return favorites, nil
}

func (service *Service) UpsertFavorite(ctx context.Context, command UpsertFavoriteCommand) (FavoriteView, error) {
	service.logger.InfoContext(ctx, "upserting favorite",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"favorite_id", command.FavoriteID,
		"project_id", command.ProjectID,
	)

	if _, err := service.resolveTrackingReferences(ctx, command.WorkspaceID, command.ProjectID, command.TaskID); err != nil {
		service.logger.WarnContext(ctx, "failed to resolve tracking references for favorite",
			"workspace_id", command.WorkspaceID,
			"project_id", command.ProjectID,
			"task_id", command.TaskID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}

	if command.FavoriteID == nil {
		favorite, err := service.store.CreateFavorite(ctx, CreateFavoriteRecord{
			WorkspaceID: command.WorkspaceID,
			UserID:      command.UserID,
			ProjectID:   command.ProjectID,
			TaskID:      command.TaskID,
			Description: valueOrEmpty(command.Description),
			Billable:    lo.FromPtr(command.Billable),
			Public:      lo.FromPtr(command.Public),
			Rank:        lo.FromPtr(command.Rank),
			TagIDs:      command.TagIDs,
		})
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to create favorite",
				"workspace_id", command.WorkspaceID,
				"user_id", command.UserID,
				"error", err.Error(),
			)
			return FavoriteView{}, err
		}
		service.logger.InfoContext(ctx, "favorite created",
			"favorite_id", favorite.ID,
		)
		return favorite, nil
	}

	favorites, err := service.store.ListFavorites(ctx, command.WorkspaceID, command.UserID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list favorites for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}
	var current *FavoriteView
	for index := range favorites {
		if favorites[index].ID == *command.FavoriteID {
			current = &favorites[index]
			break
		}
	}
	if current == nil {
		service.logger.WarnContext(ctx, "favorite not found for update",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"favorite_id", *command.FavoriteID,
		)
		return FavoriteView{}, ErrFavoriteNotFound
	}

	if command.Description != nil {
		current.Description = strings.TrimSpace(*command.Description)
	}
	if command.Billable != nil {
		current.Billable = *command.Billable
	}
	if command.Public != nil {
		current.Public = *command.Public
	}
	if command.Rank != nil {
		current.Rank = *command.Rank
	}
	if command.ProjectID != nil {
		current.ProjectID = command.ProjectID
	}
	if command.TaskID != nil {
		current.TaskID = command.TaskID
	}
	if command.ReplaceTags {
		current.TagIDs = append([]int64(nil), command.TagIDs...)
	}
	current.UpdatedAt = service.now()

	updated, err := service.store.UpdateFavorite(ctx, *current)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to update favorite",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"favorite_id", *command.FavoriteID,
			"error", err.Error(),
		)
		return FavoriteView{}, err
	}
	service.logger.InfoContext(ctx, "favorite updated",
		"favorite_id", updated.ID,
	)
	return updated, nil
}

func (service *Service) DeleteFavorite(ctx context.Context, workspaceID int64, userID int64, favoriteID int64) error {
	service.logger.InfoContext(ctx, "deleting favorite",
		"workspace_id", workspaceID,
		"user_id", userID,
		"favorite_id", favoriteID,
	)
	if err := service.store.DeleteFavorite(ctx, workspaceID, userID, favoriteID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete favorite",
			"workspace_id", workspaceID,
			"user_id", userID,
			"favorite_id", favoriteID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "favorite deleted",
		"workspace_id", workspaceID,
		"user_id", userID,
		"favorite_id", favoriteID,
	)
	return nil
}
