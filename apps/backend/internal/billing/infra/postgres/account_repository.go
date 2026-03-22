package postgres

import (
	"context"
	"errors"
	"fmt"

	"opentoggl/backend/apps/backend/internal/billing/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AccountRepository struct {
	pool *pgxpool.Pool
}

func NewAccountRepository(pool *pgxpool.Pool) *AccountRepository {
	return &AccountRepository{pool: pool}
}

func (repository *AccountRepository) FindByOrganizationID(
	ctx context.Context,
	organizationID int64,
) (domain.CommercialAccount, bool, error) {
	var (
		customerID       string
		subscriptionPlan string
		subscriptionState string
		quotaRemaining   int
		quotaResetsInSec int
		quotaTotal       int
	)

	err := repository.pool.QueryRow(ctx, `
		select
			customer_id,
			subscription_plan,
			subscription_state,
			quota_remaining,
			quota_resets_in_secs,
			quota_total
		from billing_accounts
		where organization_id = $1
	`, organizationID).Scan(
		&customerID,
		&subscriptionPlan,
		&subscriptionState,
		&quotaRemaining,
		&quotaResetsInSec,
		&quotaTotal,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.CommercialAccount{}, false, nil
		}
		return domain.CommercialAccount{}, false, fmt.Errorf(
			"query billing account for organization %d: %w",
			organizationID,
			err,
		)
	}

	account, err := hydrateCommercialAccount(
		organizationID,
		customerID,
		subscriptionPlan,
		subscriptionState,
		quotaRemaining,
		quotaResetsInSec,
		quotaTotal,
	)
	if err != nil {
		return domain.CommercialAccount{}, false, err
	}
	return account, true, nil
}

func (repository *AccountRepository) Save(
	ctx context.Context,
	account domain.CommercialAccount,
) error {
	_, err := repository.pool.Exec(ctx, `
		insert into billing_accounts (
			organization_id,
			customer_id,
			subscription_plan,
			subscription_state,
			quota_remaining,
			quota_resets_in_secs,
			quota_total
		) values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (organization_id) do update
		set customer_id = excluded.customer_id,
			subscription_plan = excluded.subscription_plan,
			subscription_state = excluded.subscription_state,
			quota_remaining = excluded.quota_remaining,
			quota_resets_in_secs = excluded.quota_resets_in_secs,
			quota_total = excluded.quota_total
	`,
		account.OrganizationID,
		account.CustomerID,
		string(account.Subscription.Plan),
		string(account.Subscription.State),
		account.Quota.Remaining,
		account.Quota.ResetsInSeconds,
		account.Quota.Total,
	)
	if err != nil {
		return fmt.Errorf("save billing account for organization %d: %w", account.OrganizationID, err)
	}
	return nil
}

func hydrateCommercialAccount(
	organizationID int64,
	customerID string,
	subscriptionPlan string,
	subscriptionState string,
	quotaRemaining int,
	quotaResetsInSec int,
	quotaTotal int,
) (domain.CommercialAccount, error) {
	subscription, err := domain.NewSubscription(
		domain.Plan(subscriptionPlan),
		domain.SubscriptionState(subscriptionState),
	)
	if err != nil {
		return domain.CommercialAccount{}, fmt.Errorf(
			"hydrate billing subscription for organization %d: %w",
			organizationID,
			err,
		)
	}
	quota, err := domain.NewQuotaWindow(
		organizationID,
		quotaRemaining,
		quotaResetsInSec,
		quotaTotal,
	)
	if err != nil {
		return domain.CommercialAccount{}, fmt.Errorf(
			"hydrate billing quota for organization %d: %w",
			organizationID,
			err,
		)
	}
	account, err := domain.NewCommercialAccount(organizationID, customerID, subscription, quota)
	if err != nil {
		return domain.CommercialAccount{}, fmt.Errorf(
			"hydrate billing account for organization %d: %w",
			organizationID,
			err,
		)
	}
	return account, nil
}
