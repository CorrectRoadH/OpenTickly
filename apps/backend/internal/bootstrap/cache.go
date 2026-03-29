package bootstrap

import (
	"context"
	"fmt"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	"opentoggl/backend/apps/backend/internal/platform"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// TTL constants for each cached entity.
const (
	sessionTTL        = 5 * time.Minute
	billingAccountTTL = 5 * time.Minute
	workspaceOrgTTL   = 10 * time.Minute
	userHomeTTL       = 10 * time.Minute
	sessionShellTTL   = 2 * time.Minute
	currentTimerTTL   = 15 * time.Second
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
	_ = c.rc.Del(ctx, fmt.Sprintf("user:%d", user.ID()), fmt.Sprintf("session_shell:%d", user.ID()))
	return nil
}

// ByID is not cached — domain.User contains mutable state and password hashes.
// The session shell cache covers the hot read path (UserSnapshot level).
func (c *cachedUserRepository) ByID(ctx context.Context, id int64) (*identitydomain.User, error) {
	return c.inner.ByID(ctx, id)
}

func (c *cachedUserRepository) ByEmail(ctx context.Context, email string) (*identitydomain.User, error) {
	return c.inner.ByEmail(ctx, email)
}

func (c *cachedUserRepository) ByAPIToken(ctx context.Context, token string) (*identitydomain.User, error) {
	return c.inner.ByAPIToken(ctx, token)
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
