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
	if err := service.ensureProjectsExist(ctx, workspaceID, projectIDs); err != nil {
		return nil, err
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
	if _, ok, err := service.store.GetGroupByID(ctx, command.GroupID); err != nil {
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
