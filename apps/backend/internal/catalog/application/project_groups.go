package application

import "context"

func (service *Service) ListProjectGroups(
	ctx context.Context,
	workspaceID int64,
	projectIDs []int64,
) ([]ProjectGroupView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if len(projectIDs) == 0 {
		return []ProjectGroupView{}, nil
	}
	for _, projectID := range projectIDs {
		if _, ok, err := service.store.GetProject(ctx, workspaceID, projectID); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrProjectNotFound
		}
	}
	return service.store.ListProjectGroups(ctx, workspaceID, projectIDs)
}

func (service *Service) CreateProjectGroup(
	ctx context.Context,
	command CreateProjectGroupCommand,
) (ProjectGroupView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ProjectGroupView{}, err
	}
	if _, ok, err := service.store.GetProject(ctx, command.WorkspaceID, command.ProjectID); err != nil {
		return ProjectGroupView{}, err
	} else if !ok {
		return ProjectGroupView{}, ErrProjectNotFound
	}
	if _, ok, err := service.store.GetGroup(ctx, command.WorkspaceID, command.GroupID); err != nil {
		return ProjectGroupView{}, err
	} else if !ok {
		return ProjectGroupView{}, ErrGroupNotFound
	}
	return service.store.CreateProjectGroup(ctx, command)
}

func (service *Service) DeleteProjectGroup(ctx context.Context, workspaceID int64, projectGroupID int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if _, ok, err := service.store.GetProjectGroup(ctx, workspaceID, projectGroupID); err != nil {
		return err
	} else if !ok {
		return ErrProjectGroupNotFound
	}
	return service.store.DeleteProjectGroup(ctx, workspaceID, projectGroupID)
}
