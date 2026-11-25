package bootstrap

import (
	"context"
	"fmt"
	"time"

	catalog "opentoggl/backend/apps/backend/internal/catalog/application"
	"opentoggl/backend/apps/backend/internal/platform"
)

type catalogClientDisplayStore struct {
	catalog.Store
	cache *platform.RedisClient
}

func clientDisplayKey(workspaceID, clientID int64) string {
	return fmt.Sprintf("catalog:display:client:%d:%d", workspaceID, clientID)
}

func (store *catalogClientDisplayStore) displayClient(ctx context.Context, workspaceID, clientID int64) (catalog.ClientView, bool, error) {
	return platform.CacheAsidePositive(store.cache, ctx, clientDisplayKey(workspaceID, clientID), 5*time.Minute, func() (catalog.ClientView, bool, error) {
		return store.Store.GetClient(ctx, workspaceID, clientID)
	})
}

func (store *catalogClientDisplayStore) invalidateClients(ctx context.Context, workspaceID int64, clientIDs []int64) {
	keys := make([]string, 0, len(clientIDs))
	for _, clientID := range clientIDs {
		keys = append(keys, clientDisplayKey(workspaceID, clientID))
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	_ = store.cache.InvalidateDisplay(ctx, keys...)
}

func (store *catalogClientDisplayStore) UpdateClient(ctx context.Context, client catalog.ClientView) error {
	err := store.Store.UpdateClient(ctx, client)
	if err == nil {
		store.invalidateClients(ctx, client.WorkspaceID, []int64{client.ID})
	}
	return err
}

func (store *catalogClientDisplayStore) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	err := store.Store.DeleteClients(ctx, workspaceID, clientIDs)
	if err == nil {
		store.invalidateClients(ctx, workspaceID, clientIDs)
	}
	return err
}

func (store *catalogClientDisplayStore) ArchiveClientAndProjects(ctx context.Context, workspaceID, clientID int64) ([]int64, error) {
	ids, err := store.Store.ArchiveClientAndProjects(ctx, workspaceID, clientID)
	if err == nil {
		store.invalidateClients(ctx, workspaceID, []int64{clientID})
	}
	return ids, err
}

func (store *catalogClientDisplayStore) RestoreClientAndProjects(ctx context.Context, workspaceID, clientID int64, projectIDs []int64, restoreAll bool) error {
	err := store.Store.RestoreClientAndProjects(ctx, workspaceID, clientID, projectIDs, restoreAll)
	if err == nil {
		store.invalidateClients(ctx, workspaceID, []int64{clientID})
	}
	return err
}
