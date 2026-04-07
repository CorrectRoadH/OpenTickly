package application

import (
	"context"
	"fmt"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

func (service *Service) ListGroups(ctx context.Context, organizationID int64) ([]GroupView, error) {
	if organizationID <= 0 {
		return nil, fmt.Errorf("%w: %d", ErrInvalidWorkspace, organizationID)
	}
	return service.store.ListGroups(ctx, organizationID)
}

func (service *Service) GetGroup(ctx context.Context, organizationID int64, groupID int64) (GroupView, error) {
	return service.loadGroup(ctx, organizationID, groupID)
}

func (service *Service) CreateGroup(ctx context.Context, command CreateGroupCommand) (GroupView, error) {
	service.logger.InfoContext(ctx, "creating group",
		"organization_id", command.OrganizationID,
		"name", command.Name,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid group data",
			"organization_id", command.OrganizationID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	command.Name = name
	view, err := service.store.CreateGroup(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create group",
			"organization_id", command.OrganizationID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	service.logger.InfoContext(ctx, "group created",
		"organization_id", command.OrganizationID,
		"group_id", view.ID,
	)
	return view, nil
}

func (service *Service) UpdateGroup(ctx context.Context, organizationID int64, groupID int64, name string) (GroupView, error) {
	service.logger.InfoContext(ctx, "updating group",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	current, ok, err := service.store.GetGroup(ctx, organizationID, groupID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get group for update",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "group not found for update",
			"organization_id", organizationID,
			"group_id", groupID,
		)
		return GroupView{}, ErrGroupNotFound
	}
	normalized, err := domain.NormalizeCatalogName(name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid group name",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	current.Name = normalized
	if err := service.store.UpdateGroup(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update group",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return GroupView{}, err
	}
	view, err := service.loadGroup(ctx, organizationID, groupID)
	if err != nil {
		return GroupView{}, err
	}
	service.logger.InfoContext(ctx, "group updated",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	return view, nil
}

func (service *Service) DeleteGroup(ctx context.Context, organizationID int64, groupID int64) error {
	service.logger.InfoContext(ctx, "deleting group",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	if _, ok, err := service.store.GetGroup(ctx, organizationID, groupID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get group for deletion",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return err
	} else if !ok {
		service.logger.WarnContext(ctx, "group not found for deletion",
			"organization_id", organizationID,
			"group_id", groupID,
		)
		return ErrGroupNotFound
	}
	if err := service.store.DeleteGroup(ctx, organizationID, groupID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete group",
			"organization_id", organizationID,
			"group_id", groupID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "group deleted",
		"organization_id", organizationID,
		"group_id", groupID,
	)
	return nil
}

func (service *Service) ListGroupMembers(ctx context.Context, groupID int64) ([]GroupMemberView, error) {
	return service.store.ListGroupMembers(ctx, groupID)
}

func (service *Service) ListGroupWorkspaces(ctx context.Context, groupID int64) ([]GroupWorkspaceView, error) {
	return service.store.ListGroupWorkspaces(ctx, groupID)
}

// SyncGroupMembers replaces the group's member list with the given user IDs.
// It diffs the current state, adding missing members and removing extra ones.
func (service *Service) SyncGroupMembers(ctx context.Context, groupID int64, desiredUserIDs []int64) error {
	current, err := service.store.ListGroupMembers(ctx, groupID)
	if err != nil {
		return err
	}

	currentSet := make(map[int64]bool, len(current))
	for _, m := range current {
		currentSet[m.UserID] = true
	}

	desiredSet := make(map[int64]bool, len(desiredUserIDs))
	for _, id := range desiredUserIDs {
		desiredSet[id] = true
	}

	// Add missing
	for _, id := range desiredUserIDs {
		if !currentSet[id] {
			if err := service.store.AddGroupMember(ctx, groupID, id); err != nil {
				return err
			}
		}
	}

	// Remove extra
	for _, m := range current {
		if !desiredSet[m.UserID] {
			if err := service.store.RemoveGroupMember(ctx, groupID, m.UserID); err != nil {
				return err
			}
		}
	}

	return nil
}

// SyncGroupWorkspaces replaces the group's workspace list with the given workspace IDs.
func (service *Service) SyncGroupWorkspaces(ctx context.Context, groupID int64, desiredWorkspaceIDs []int64) error {
	current, err := service.store.ListGroupWorkspaces(ctx, groupID)
	if err != nil {
		return err
	}

	currentSet := make(map[int64]bool, len(current))
	for _, w := range current {
		currentSet[w.WorkspaceID] = true
	}

	desiredSet := make(map[int64]bool, len(desiredWorkspaceIDs))
	for _, id := range desiredWorkspaceIDs {
		desiredSet[id] = true
	}

	for _, id := range desiredWorkspaceIDs {
		if !currentSet[id] {
			if err := service.store.AddGroupWorkspace(ctx, groupID, id); err != nil {
				return err
			}
		}
	}

	for _, w := range current {
		if !desiredSet[w.WorkspaceID] {
			if err := service.store.RemoveGroupWorkspace(ctx, groupID, w.WorkspaceID); err != nil {
				return err
			}
		}
	}

	return nil
}

func (service *Service) loadGroup(ctx context.Context, organizationID int64, groupID int64) (GroupView, error) {
	group, ok, err := service.store.GetGroup(ctx, organizationID, groupID)
	if err != nil {
		return GroupView{}, err
	}
	if !ok {
		return GroupView{}, ErrGroupNotFound
	}
	return group, nil
}
