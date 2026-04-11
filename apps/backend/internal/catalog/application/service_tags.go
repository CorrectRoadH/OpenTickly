package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

func (service *Service) ListTags(ctx context.Context, workspaceID int64, filter ListTagsFilter) ([]TagView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	filter.Search = strings.TrimSpace(filter.Search)
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePerPage(filter.PerPage, 200, 200)
	return service.store.ListTags(ctx, workspaceID, filter)
}

func (service *Service) CreateTag(ctx context.Context, command CreateTagCommand) (TagView, error) {
	service.logger.InfoContext(ctx, "creating tag",
		"workspace_id", command.WorkspaceID,
		"name", command.Name,
	)

	// Enforce workspace settings before any mutation.
	settings, err := service.getWorkspaceSettings(ctx, command.WorkspaceID)
	if err != nil {
		return TagView{}, err
	}
	if err := service.requireAdminForSetting(ctx, command.WorkspaceID, command.CreatedBy, settings.OnlyAdminsMayCreateTags()); err != nil {
		service.logger.WarnContext(ctx, "create tag denied by workspace settings",
			"workspace_id", command.WorkspaceID,
			"user_id", command.CreatedBy,
		)
		return TagView{}, err
	}

	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid tag data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	command.Name = name
	view, err := service.store.CreateTag(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create tag",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	service.logger.InfoContext(ctx, "tag created",
		"workspace_id", command.WorkspaceID,
		"tag_id", view.ID,
	)
	return view, nil
}

func (service *Service) EnsureTagsByName(ctx context.Context, workspaceID int64, createdBy int64, names []string) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	return service.store.EnsureTagsByName(ctx, workspaceID, createdBy, names)
}

func (service *Service) GetTag(ctx context.Context, workspaceID int64, tagID int64) (TagView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return TagView{}, err
	}
	return service.loadTag(ctx, workspaceID, tagID)
}

func (service *Service) UpdateTag(ctx context.Context, command UpdateTagCommand) (TagView, error) {
	service.logger.InfoContext(ctx, "updating tag",
		"workspace_id", command.WorkspaceID,
		"tag_id", command.TagID,
	)
	current, ok, err := service.store.GetTag(ctx, command.WorkspaceID, command.TagID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get tag for update",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "tag not found for update",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
		)
		return TagView{}, ErrTagNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid tag name",
				"workspace_id", command.WorkspaceID,
				"tag_id", command.TagID,
				"error", err.Error(),
			)
			return TagView{}, err
		}
		current.Name = name
	}

	if err := service.store.UpdateTag(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update tag",
			"workspace_id", command.WorkspaceID,
			"tag_id", command.TagID,
			"error", err.Error(),
		)
		return TagView{}, err
	}
	view, err := service.loadTag(ctx, command.WorkspaceID, command.TagID)
	if err != nil {
		return TagView{}, err
	}
	service.logger.InfoContext(ctx, "tag updated",
		"workspace_id", command.WorkspaceID,
		"tag_id", command.TagID,
	)
	return view, nil
}

func (service *Service) DeleteTag(ctx context.Context, workspaceID int64, tagID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	service.logger.InfoContext(ctx, "deleting tag",
		"workspace_id", workspaceID,
		"tag_id", tagID,
	)
	if _, ok, err := service.store.GetTag(ctx, workspaceID, tagID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get tag for deletion",
			"workspace_id", workspaceID,
			"tag_id", tagID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "tag not found for deletion",
			"workspace_id", workspaceID,
			"tag_id", tagID,
		)
		return ErrTagNotFound
	}
	if err := service.store.DeleteTag(ctx, workspaceID, tagID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete tag",
			"workspace_id", workspaceID,
			"tag_id", tagID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "tag deleted",
		"workspace_id", workspaceID,
		"tag_id", tagID,
	)
	return nil
}

func (service *Service) DeleteTags(ctx context.Context, workspaceID int64, tagIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(tagIDs) == 0 {
		return nil
	}
	service.logger.InfoContext(ctx, "deleting tags",
		"workspace_id", workspaceID,
		"tag_ids", tagIDs,
	)
	if err := service.store.DeleteTags(ctx, workspaceID, tagIDs); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete tags",
			"workspace_id", workspaceID,
			"tag_ids", tagIDs,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "tags deleted",
		"workspace_id", workspaceID,
		"tag_ids", tagIDs,
	)
	return nil
}

func (service *Service) loadTag(ctx context.Context, workspaceID int64, tagID int64) (TagView, error) {
	tag, ok, err := service.store.GetTag(ctx, workspaceID, tagID)
	if err != nil {
		return TagView{}, err
	}
	if !ok {
		return TagView{}, ErrTagNotFound
	}
	return tag, nil
}
