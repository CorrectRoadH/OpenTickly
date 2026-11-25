package bootstrap

import (
	"context"
	"fmt"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	"opentoggl/backend/apps/backend/internal/platform"
)

// TTL constants for each cached entity.
const (
	sessionTTL        = 5 * time.Minute
	apiTokenTTL       = 30 * time.Minute
	billingAccountTTL = 5 * time.Minute
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
	return c.inner.Put(ctx, session)
}

func (c *cachedSessionRepository) UserIDBySession(ctx context.Context, sessionID string) (int64, error) {
	// Revocation must be immediate, including legacy Redis entries from old replicas.
	return c.inner.UserIDBySession(ctx, sessionID)
}

func (c *cachedSessionRepository) Delete(ctx context.Context, sessionID string) error {
	if userID, err := c.UserIDBySession(ctx, sessionID); err == nil {
		_ = c.rc.Del(ctx, fmt.Sprintf("user:%d", userID))
	}
	_ = c.rc.Del(ctx, fmt.Sprintf("session:%s", sessionID))
	return c.inner.Delete(ctx, sessionID)
}

func (c *cachedSessionRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	// Session reads are authoritative; old cache entries cannot authorize requests.
	_ = c.rc.Del(ctx, fmt.Sprintf("user:%d", userID))
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
		fmt.Sprintf("api_token_uid:%d", user.ID()),
	)
	return nil
}

// ByID is not cached — domain.User has unexported fields (DDD entity invariant
// protection) so json.Marshal produces "{}". Read the authoritative user instead.
func (c *cachedUserRepository) ByID(ctx context.Context, id int64) (*identitydomain.User, error) {
	return c.inner.ByID(ctx, id)
}

func (c *cachedUserRepository) ByEmail(ctx context.Context, email string) (*identitydomain.User, error) {
	return c.inner.ByEmail(ctx, email)
}

func (c *cachedUserRepository) ByLoginIdentifier(ctx context.Context, identifier string) (*identitydomain.User, error) {
	return c.inner.ByLoginIdentifier(ctx, identifier)
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
