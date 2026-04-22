package bootstrap

import (
	"context"
	"fmt"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	"opentoggl/backend/apps/backend/internal/platform"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// TTL constants for each cached entity.
const (
	sessionTTL        = 5 * time.Minute
	apiTokenTTL       = 30 * time.Minute
	billingAccountTTL = 5 * time.Minute
	workspaceOrgTTL   = 10 * time.Minute
	userHomeTTL       = 10 * time.Minute
	sessionShellTTL   = 2 * time.Minute
	currentTimerTTL   = 15 * time.Second
	catalogListTTL    = 2 * time.Minute
	catalogItemTTL    = 5 * time.Minute
)

// --- session repository cache ---

type cachedSessionRepository struct {
	inner identityapplication.SessionRepository
	rc    *platform.RedisClient
}

func newCachedSessionRepository(inner identityapplication.SessionRepository, rc *platform.RedisClient) *cachedSessionRepository {
	return &cachedSessionRepository{inner: inner, rc: rc}
}

func (c *cachedSessionRepository) Put(ctx context.Context, session identityapplication.Session) error {
	if err := c.inner.Put(ctx, session); err != nil {
		return err
	}
	_ = c.rc.Set(ctx, fmt.Sprintf("session:%s", session.ID), session.UserID, sessionTTL)
	return nil
}

func (c *cachedSessionRepository) UserIDBySession(ctx context.Context, sessionID string) (int64, error) {
	return platform.CacheAside(c.rc, ctx, fmt.Sprintf("session:%s", sessionID), sessionTTL, func() (int64, error) {
		return c.inner.UserIDBySession(ctx, sessionID)
	})
}

func (c *cachedSessionRepository) Delete(ctx context.Context, sessionID string) error {
	if userID, err := c.UserIDBySession(ctx, sessionID); err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("user:%d", userID))
		_ = c.rc.Del(ctx, fmt.Sprintf("session_shell:%d", userID))
	}
	_ = c.rc.Del(ctx, fmt.Sprintf("session:%s", sessionID))
	return c.inner.Delete(ctx, sessionID)
}

func (c *cachedSessionRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	// We cannot target individual session:<id> keys without a secondary index,
	// so invalidate the per-user keys and let stale session:<id> entries expire
	// on their TTL. The source-of-truth DELETE below ensures lookups that miss
	// the cache will not resurrect the session.
	_ = c.rc.Del(ctx, fmt.Sprintf("user:%d", userID))
	_ = c.rc.Del(ctx, fmt.Sprintf("session_shell:%d", userID))
	return c.inner.DeleteByUserID(ctx, userID)
}

// --- user repository cache ---

type cachedUserRepository struct {
	inner identityapplication.UserRepository
	rc    *platform.RedisClient
}

func newCachedUserRepository(inner identityapplication.UserRepository, rc *platform.RedisClient) *cachedUserRepository {
	return &cachedUserRepository{inner: inner, rc: rc}
}

func (c *cachedUserRepository) Save(ctx context.Context, user *identitydomain.User) error {
	if err := c.inner.Save(ctx, user); err != nil {
		return err
	}
	_ = c.rc.Del(ctx,
		fmt.Sprintf("user:%d", user.ID()),
		fmt.Sprintf("session_shell:%d", user.ID()),
		fmt.Sprintf("api_token_uid:%d", user.ID()),
	)
	return nil
}

// ByID is not cached — domain.User has unexported fields (DDD entity invariant
// protection) so json.Marshal produces "{}". The session shell cache covers the
// hot read path at the UserSnapshot level instead.
func (c *cachedUserRepository) ByID(ctx context.Context, id int64) (*identitydomain.User, error) {
	return c.inner.ByID(ctx, id)
}

func (c *cachedUserRepository) ByEmail(ctx context.Context, email string) (*identitydomain.User, error) {
	return c.inner.ByEmail(ctx, email)
}

// ByAPIToken caches the token→userID mapping to avoid a full index scan on
// identity_users.api_token per API request. The *domain.User itself is not
// cached (unexported fields), so a cheap primary-key ByID follows the hit.
func (c *cachedUserRepository) ByAPIToken(ctx context.Context, token string) (*identitydomain.User, error) {
	userID, err := platform.CacheAside(c.rc, ctx, fmt.Sprintf("api_token:%s", token), apiTokenTTL, func() (int64, error) {
		user, fetchErr := c.inner.ByAPIToken(ctx, token)
		if fetchErr != nil {
			return 0, fetchErr
		}
		return user.ID(), nil
	})
	if err != nil {
		return nil, err
	}
	return c.inner.ByID(ctx, userID)
}

func (c *cachedUserRepository) ByProductEmailsDisableCode(ctx context.Context, code string) (*identitydomain.User, error) {
	return c.inner.ByProductEmailsDisableCode(ctx, code)
}

func (c *cachedUserRepository) ByWeeklyReportDisableCode(ctx context.Context, code string) (*identitydomain.User, error) {
	return c.inner.ByWeeklyReportDisableCode(ctx, code)
}

// --- session shell cache ---

type cachedSessionShellProvider struct {
	inner identityweb.SessionShellProvider
	rc    *platform.RedisClient
}

func newCachedSessionShellProvider(inner identityweb.SessionShellProvider, rc *platform.RedisClient) *cachedSessionShellProvider {
	return &cachedSessionShellProvider{inner: inner, rc: rc}
}

func (c *cachedSessionShellProvider) SessionShell(ctx context.Context, user identityapplication.UserSnapshot) (identityweb.SessionShellData, error) {
	return platform.CacheAside(c.rc, ctx, fmt.Sprintf("session_shell:%d", user.ID), sessionShellTTL, func() (identityweb.SessionShellData, error) {
		return c.inner.SessionShell(ctx, user)
	})
}

// --- billing account repository cache ---

type cachedBillingAccount struct {
	Account billingdomain.CommercialAccount `json:"account"`
	Found   bool                            `json:"found"`
}

type cachedAccountRepository struct {
	inner billingapplication.AccountRepository
	rc    *platform.RedisClient
}

func newCachedAccountRepository(inner billingapplication.AccountRepository, rc *platform.RedisClient) *cachedAccountRepository {
	return &cachedAccountRepository{inner: inner, rc: rc}
}

func (c *cachedAccountRepository) FindByOrganizationID(ctx context.Context, organizationID int64) (billingdomain.CommercialAccount, bool, error) {
	result, err := platform.CacheAside(c.rc, ctx, fmt.Sprintf("billing:org:%d", organizationID), billingAccountTTL, func() (cachedBillingAccount, error) {
		account, ok, fetchErr := c.inner.FindByOrganizationID(ctx, organizationID)
		return cachedBillingAccount{Account: account, Found: ok}, fetchErr
	})
	return result.Account, result.Found, err
}

func (c *cachedAccountRepository) Save(ctx context.Context, account billingdomain.CommercialAccount) error {
	if err := c.inner.Save(ctx, account); err != nil {
		return err
	}
	_ = c.rc.Del(ctx, fmt.Sprintf("billing:org:%d", account.OrganizationID))
	return nil
}

// --- workspace ownership lookup cache ---

type cachedWorkspaceOwnershipLookup struct {
	inner billingapplication.WorkspaceOwnershipLookup
	rc    *platform.RedisClient
}

func newCachedWorkspaceOwnershipLookup(inner billingapplication.WorkspaceOwnershipLookup, rc *platform.RedisClient) *cachedWorkspaceOwnershipLookup {
	return &cachedWorkspaceOwnershipLookup{inner: inner, rc: rc}
}

func (c *cachedWorkspaceOwnershipLookup) OrganizationIDForWorkspace(ctx context.Context, workspaceID int64) (int64, error) {
	return platform.CacheAside(c.rc, ctx, fmt.Sprintf("ws_org:%d", workspaceID), workspaceOrgTTL, func() (int64, error) {
		return c.inner.OrganizationIDForWorkspace(ctx, workspaceID)
	})
}

// --- user home repository cache ---

type cachedUserHome struct {
	OrganizationID int64 `json:"organization_id"`
	WorkspaceID    int64 `json:"workspace_id"`
	Found          bool  `json:"found"`
}

type cachedUserHomeRepository struct {
	inner userHomeRepository
	rc    *platform.RedisClient
}

func newCachedUserHomeRepository(inner userHomeRepository, rc *platform.RedisClient) *cachedUserHomeRepository {
	return &cachedUserHomeRepository{inner: inner, rc: rc}
}

func (c *cachedUserHomeRepository) FindByUserID(ctx context.Context, userID int64) (int64, int64, bool, error) {
	result, err := platform.CacheAside(c.rc, ctx, fmt.Sprintf("user_home:%d", userID), userHomeTTL, func() (cachedUserHome, error) {
		orgID, wsID, ok, fetchErr := c.inner.FindByUserID(ctx, userID)
		return cachedUserHome{OrganizationID: orgID, WorkspaceID: wsID, Found: ok}, fetchErr
	})
	return result.OrganizationID, result.WorkspaceID, result.Found, err
}

func (c *cachedUserHomeRepository) Save(ctx context.Context, userID int64, organizationID int64, workspaceID int64) error {
	if err := c.inner.Save(ctx, userID, organizationID, workspaceID); err != nil {
		return err
	}
	_ = c.rc.Del(ctx, fmt.Sprintf("user_home:%d", userID), fmt.Sprintf("session_shell:%d", userID))
	return nil
}

// --- tracking store cache (current timer only) ---

type cachedCurrentTimer struct {
	Entry trackingapplication.TimeEntryView `json:"entry"`
	Found bool                              `json:"found"`
}

type cachedTrackingStore struct {
	trackingapplication.Store
	rc *platform.RedisClient
}

func newCachedTrackingStore(inner trackingapplication.Store, rc *platform.RedisClient) *cachedTrackingStore {
	return &cachedTrackingStore{Store: inner, rc: rc}
}

func (c *cachedTrackingStore) GetCurrentTimeEntry(ctx context.Context, userID int64) (trackingapplication.TimeEntryView, bool, error) {
	result, err := platform.CacheAside(c.rc, ctx, timerKey(userID), currentTimerTTL, func() (cachedCurrentTimer, error) {
		entry, ok, fetchErr := c.Store.GetCurrentTimeEntry(ctx, userID)
		return cachedCurrentTimer{Entry: entry, Found: ok}, fetchErr
	})
	return result.Entry, result.Found, err
}

func (c *cachedTrackingStore) CreateTimeEntry(ctx context.Context, record trackingapplication.CreateTimeEntryRecord) (trackingapplication.TimeEntryView, error) {
	entry, err := c.Store.CreateTimeEntry(ctx, record)
	if err == nil {
		_ = c.rc.Del(ctx, timerKey(record.UserID))
	}
	return entry, err
}

func (c *cachedTrackingStore) UpdateTimeEntry(ctx context.Context, record trackingapplication.UpdateTimeEntryRecord) (trackingapplication.TimeEntryView, error) {
	entry, err := c.Store.UpdateTimeEntry(ctx, record)
	if err == nil {
		_ = c.rc.Del(ctx, timerKey(record.UserID))
	}
	return entry, err
}

func (c *cachedTrackingStore) DeleteTimeEntry(ctx context.Context, workspaceID int64, userID int64, entryID int64) error {
	err := c.Store.DeleteTimeEntry(ctx, workspaceID, userID, entryID)
	if err == nil {
		_ = c.rc.Del(ctx, timerKey(userID))
	}
	return err
}

func (c *cachedTrackingStore) SetRunningTimeEntry(ctx context.Context, userID int64, entryID int64) error {
	err := c.Store.SetRunningTimeEntry(ctx, userID, entryID)
	if err == nil {
		_ = c.rc.Del(ctx, timerKey(userID))
	}
	return err
}

func (c *cachedTrackingStore) ClearRunningTimeEntry(ctx context.Context, userID int64) error {
	err := c.Store.ClearRunningTimeEntry(ctx, userID)
	if err == nil {
		_ = c.rc.Del(ctx, timerKey(userID))
	}
	return err
}

func timerKey(userID int64) string {
	return fmt.Sprintf("timer:%d", userID)
}

// --- catalog store cache (projects, tags, clients) ---

type cachedCatalogProject struct {
	Project catalogapplication.ProjectView `json:"project"`
	Found   bool                          `json:"found"`
}

type cachedCatalogTag struct {
	Tag   catalogapplication.TagView `json:"tag"`
	Found bool                      `json:"found"`
}

type cachedCatalogClient struct {
	Client catalogapplication.ClientView `json:"client"`
	Found  bool                         `json:"found"`
}

type cachedCatalogStore struct {
	catalogapplication.Store
	rc *platform.RedisClient
}

func newCachedCatalogStore(inner catalogapplication.Store, rc *platform.RedisClient) *cachedCatalogStore {
	return &cachedCatalogStore{Store: inner, rc: rc}
}

// --- read caches ---
//
// List endpoints (ListProjects/ListTags/ListClients) are intentionally
// NOT cached. The filter argument meaningfully changes the result set
// (active-only vs include-archived, search, pagination) and the old
// workspace-keyed cache served a narrower result to callers asking for
// a wider view, breaking /me/projects and /workspaces/{id}/projects
// correctness. Per-workspace reads remain cheap (single indexed scan);
// if this becomes a hot path, add a filter-aware key + SCAN-based
// invalidation rather than bringing back the ambiguous shared key.

func (c *cachedCatalogStore) GetProject(ctx context.Context, workspaceID int64, projectID int64) (catalogapplication.ProjectView, bool, error) {
	key := fmt.Sprintf("catalog:project:%d:%d", workspaceID, projectID)
	result, err := platform.CacheAside(c.rc, ctx, key, catalogItemTTL, func() (cachedCatalogProject, error) {
		project, ok, fetchErr := c.Store.GetProject(ctx, workspaceID, projectID)
		return cachedCatalogProject{Project: project, Found: ok}, fetchErr
	})
	return result.Project, result.Found, err
}

func (c *cachedCatalogStore) GetTag(ctx context.Context, workspaceID int64, tagID int64) (catalogapplication.TagView, bool, error) {
	key := fmt.Sprintf("catalog:tag:%d:%d", workspaceID, tagID)
	result, err := platform.CacheAside(c.rc, ctx, key, catalogItemTTL, func() (cachedCatalogTag, error) {
		tag, ok, fetchErr := c.Store.GetTag(ctx, workspaceID, tagID)
		return cachedCatalogTag{Tag: tag, Found: ok}, fetchErr
	})
	return result.Tag, result.Found, err
}

func (c *cachedCatalogStore) GetClient(ctx context.Context, workspaceID int64, clientID int64) (catalogapplication.ClientView, bool, error) {
	key := fmt.Sprintf("catalog:client:%d:%d", workspaceID, clientID)
	result, err := platform.CacheAside(c.rc, ctx, key, catalogItemTTL, func() (cachedCatalogClient, error) {
		client, ok, fetchErr := c.Store.GetClient(ctx, workspaceID, clientID)
		return cachedCatalogClient{Client: client, Found: ok}, fetchErr
	})
	return result.Client, result.Found, err
}

// --- write invalidation ---
//
// List caches were removed (see above); invalidation now only needs to
// clear single-item caches (catalog:project:<ws>:<id> etc.) on the
// mutation call sites.
func (c *cachedCatalogStore) catalogInvalidateWorkspace(ctx context.Context, workspaceID int64) {
	_ = workspaceID
	_ = ctx
}

func (c *cachedCatalogStore) CreateProject(ctx context.Context, cmd catalogapplication.CreateProjectCommand) (catalogapplication.ProjectView, error) {
	v, err := c.Store.CreateProject(ctx, cmd)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, cmd.WorkspaceID)
	}
	return v, err
}

func (c *cachedCatalogStore) UpdateProject(ctx context.Context, project catalogapplication.ProjectView) error {
	err := c.Store.UpdateProject(ctx, project)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, project.WorkspaceID)
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:project:%d:%d", project.WorkspaceID, project.ID))
	}
	return err
}

func (c *cachedCatalogStore) DeleteProject(ctx context.Context, workspaceID int64, projectID int64) error {
	err := c.Store.DeleteProject(ctx, workspaceID, projectID)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, workspaceID)
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:project:%d:%d", workspaceID, projectID))
	}
	return err
}

func (c *cachedCatalogStore) CreateTag(ctx context.Context, cmd catalogapplication.CreateTagCommand) (catalogapplication.TagView, error) {
	return c.Store.CreateTag(ctx, cmd)
}

func (c *cachedCatalogStore) UpdateTag(ctx context.Context, tag catalogapplication.TagView) error {
	err := c.Store.UpdateTag(ctx, tag)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:tags:%d", tag.WorkspaceID), fmt.Sprintf("catalog:tag:%d:%d", tag.WorkspaceID, tag.ID))
	}
	return err
}

func (c *cachedCatalogStore) DeleteTag(ctx context.Context, workspaceID int64, tagID int64) error {
	err := c.Store.DeleteTag(ctx, workspaceID, tagID)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:tags:%d", workspaceID), fmt.Sprintf("catalog:tag:%d:%d", workspaceID, tagID))
	}
	return err
}

func (c *cachedCatalogStore) DeleteTags(ctx context.Context, workspaceID int64, tagIDs []int64) error {
	err := c.Store.DeleteTags(ctx, workspaceID, tagIDs)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:tags:%d", workspaceID))
	}
	return err
}

func (c *cachedCatalogStore) CreateClient(ctx context.Context, cmd catalogapplication.CreateClientCommand) (catalogapplication.ClientView, error) {
	v, err := c.Store.CreateClient(ctx, cmd)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:clients:%d", cmd.WorkspaceID))
	}
	return v, err
}

func (c *cachedCatalogStore) UpdateClient(ctx context.Context, client catalogapplication.ClientView) error {
	err := c.Store.UpdateClient(ctx, client)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:clients:%d", client.WorkspaceID), fmt.Sprintf("catalog:client:%d:%d", client.WorkspaceID, client.ID))
	}
	return err
}

func (c *cachedCatalogStore) DeleteClients(ctx context.Context, workspaceID int64, clientIDs []int64) error {
	err := c.Store.DeleteClients(ctx, workspaceID, clientIDs)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, workspaceID)
	}
	return err
}

func (c *cachedCatalogStore) PatchProjects(ctx context.Context, workspaceID int64, projectIDs []int64, commands []catalogapplication.PatchProjectCommand) error {
	err := c.Store.PatchProjects(ctx, workspaceID, projectIDs, commands)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, workspaceID)
	}
	return err
}

func (c *cachedCatalogStore) SetProjectPinned(ctx context.Context, workspaceID int64, projectID int64, pinned bool) error {
	err := c.Store.SetProjectPinned(ctx, workspaceID, projectID, pinned)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:projects:%d", workspaceID), fmt.Sprintf("catalog:project:%d:%d", workspaceID, projectID))
	}
	return err
}

func (c *cachedCatalogStore) ArchiveClientAndProjects(ctx context.Context, workspaceID int64, clientID int64) ([]int64, error) {
	ids, err := c.Store.ArchiveClientAndProjects(ctx, workspaceID, clientID)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, workspaceID)
	}
	return ids, err
}

func (c *cachedCatalogStore) RestoreClientAndProjects(ctx context.Context, workspaceID int64, clientID int64, projectIDs []int64, restoreAll bool) error {
	err := c.Store.RestoreClientAndProjects(ctx, workspaceID, clientID, projectIDs, restoreAll)
	if err == nil {
		c.catalogInvalidateWorkspace(ctx, workspaceID)
	}
	return err
}

func (c *cachedCatalogStore) EnsureTagsByName(ctx context.Context, workspaceID int64, createdBy int64, names []string) ([]int64, error) {
	ids, err := c.Store.EnsureTagsByName(ctx, workspaceID, createdBy, names)
	if err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("catalog:tags:%d", workspaceID))
	}
	return ids, err
}
