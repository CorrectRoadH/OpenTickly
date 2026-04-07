package application

import (
	"context"
	"strings"

	"opentoggl/backend/apps/backend/internal/catalog/domain"
)

func (service *Service) ListClients(ctx context.Context, workspaceID int64, filter ListClientsFilter) ([]ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	filter.Name = strings.TrimSpace(filter.Name)
	filter.Status = normalizeClientStatus(filter.Status)
	return service.store.ListClients(ctx, workspaceID, filter)
}

func (service *Service) ListClientsByIDs(ctx context.Context, workspaceID int64, clientIDs []int64) ([]ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if len(clientIDs) == 0 {
		return []ClientView{}, nil
	}
	clients, err := service.store.ListClientsByIDs(ctx, workspaceID, clientIDs)
	if err != nil {
		return nil, err
	}
	if len(clients) != len(clientIDs) {
		return nil, ErrClientNotFound
	}
	return clients, nil
}

func (service *Service) CreateClient(ctx context.Context, command CreateClientCommand) (ClientView, error) {
	service.logger.InfoContext(ctx, "creating client",
		"workspace_id", command.WorkspaceID,
		"name", command.Name,
	)
	name, err := domain.NormalizeCatalogName(command.Name)
	if err != nil {
		service.logger.WarnContext(ctx, "invalid client data",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	command.Name = name
	view, err := service.store.CreateClient(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create client",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client created",
		"workspace_id", command.WorkspaceID,
		"client_id", view.ID,
	)
	return view, nil
}

func (service *Service) GetClient(ctx context.Context, workspaceID int64, clientID int64) (ClientView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return ClientView{}, err
	}
	return service.loadClient(ctx, workspaceID, clientID)
}

func (service *Service) UpdateClient(ctx context.Context, command UpdateClientCommand) (ClientView, error) {
	service.logger.InfoContext(ctx, "updating client",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
	)
	current, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for update",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "client not found for update",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
		)
		return ClientView{}, ErrClientNotFound
	}

	if command.Name != nil {
		name, err := domain.NormalizeCatalogName(*command.Name)
		if err != nil {
			service.logger.WarnContext(ctx, "invalid client name",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"error", err.Error(),
			)
			return ClientView{}, err
		}
		current.Name = name
	}
	if command.Notes != nil {
		current.Notes = *command.Notes
	}

	if err := service.store.UpdateClient(ctx, current); err != nil {
		service.logger.ErrorContext(ctx, "failed to update client",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	view, err := service.loadClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client updated",
		"workspace_id", command.WorkspaceID,
		"client_id", view.ID,
	)
	return view, nil
}

func (service *Service) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return err
	}
	if len(clientIDs) == 0 {
		return nil
	}
	service.logger.InfoContext(ctx, "deleting clients",
		"workspace_id", workspaceID,
		"client_ids", clientIDs,
	)
	if _, err := service.ListClientsByIDs(ctx, workspaceID, clientIDs); err != nil {
		return err
	}
	if err := service.store.DeleteClients(ctx, workspaceID, clientIDs); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete clients",
			"workspace_id", workspaceID,
			"client_ids", clientIDs,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "clients deleted",
		"workspace_id", workspaceID,
		"client_ids", clientIDs,
	)
	return nil
}

func (service *Service) ArchiveClient(ctx context.Context, workspaceID int64, clientID int64) ([]int64, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	service.logger.InfoContext(ctx, "archiving client",
		"workspace_id", workspaceID,
		"client_id", clientID,
	)
	if _, ok, err := service.store.GetClient(ctx, workspaceID, clientID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for archive",
			"workspace_id", workspaceID,
			"client_id", clientID,
			"error", err.Error(),
		)
		return nil, err
	} else if !ok {
		service.logger.WarnContext(ctx, "client not found for archive",
			"workspace_id", workspaceID,
			"client_id", clientID,
		)
		return nil, ErrClientNotFound
	}
	projectIDs, err := service.store.ArchiveClientAndProjects(ctx, workspaceID, clientID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to archive client",
			"workspace_id", workspaceID,
			"client_id", clientID,
			"error", err.Error(),
		)
		return nil, err
	}
	service.logger.InfoContext(ctx, "client archived",
		"workspace_id", workspaceID,
		"client_id", clientID,
		"archived_project_ids", projectIDs,
	)
	return projectIDs, nil
}

func (service *Service) RestoreClient(ctx context.Context, command RestoreClientCommand) (ClientView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "restoring client",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
		"project_ids", command.ProjectIDs,
		"restore_all_projects", command.RestoreAllProjects,
	)
	if _, ok, err := service.store.GetClient(ctx, command.WorkspaceID, command.ClientID); err != nil {
		service.logger.ErrorContext(ctx, "failed to get client for restore",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	} else if !ok {
		service.logger.WarnContext(ctx, "client not found for restore",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
		)
		return ClientView{}, ErrClientNotFound
	}
	for _, projectID := range command.ProjectIDs {
		project, ok, err := service.store.GetProject(ctx, command.WorkspaceID, projectID)
		if err != nil {
			service.logger.ErrorContext(ctx, "failed to get project for restore",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"project_id", projectID,
				"error", err.Error(),
			)
			return ClientView{}, err
		}
		if !ok || project.ClientID == nil || *project.ClientID != command.ClientID {
			service.logger.WarnContext(ctx, "project not found for restore",
				"workspace_id", command.WorkspaceID,
				"client_id", command.ClientID,
				"project_id", projectID,
			)
			return ClientView{}, ErrProjectNotFound
		}
	}
	if err := service.store.RestoreClientAndProjects(
		ctx,
		command.WorkspaceID,
		command.ClientID,
		command.ProjectIDs,
		command.RestoreAllProjects || len(command.ProjectIDs) == 0,
	); err != nil {
		service.logger.ErrorContext(ctx, "failed to restore client",
			"workspace_id", command.WorkspaceID,
			"client_id", command.ClientID,
			"error", err.Error(),
		)
		return ClientView{}, err
	}
	view, err := service.loadClient(ctx, command.WorkspaceID, command.ClientID)
	if err != nil {
		return ClientView{}, err
	}
	service.logger.InfoContext(ctx, "client restored",
		"workspace_id", command.WorkspaceID,
		"client_id", command.ClientID,
	)
	return view, nil
}

func (service *Service) loadClient(ctx context.Context, workspaceID int64, clientID int64) (ClientView, error) {
	client, ok, err := service.store.GetClient(ctx, workspaceID, clientID)
	if err != nil {
		return ClientView{}, err
	}
	if !ok {
		return ClientView{}, ErrClientNotFound
	}
	return client, nil
}
