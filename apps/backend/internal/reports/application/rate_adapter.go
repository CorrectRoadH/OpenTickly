package application

import (
	"context"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

// CatalogRateResolver resolves billable rates from the catalog service.
type CatalogRateResolver struct {
	catalog CatalogRateQueries
}

// CatalogRateQueries is the subset of catalog functionality needed for rate resolution.
type CatalogRateQueries interface {
	GetRatesByLevel(
		ctx context.Context,
		workspaceID int64,
		level catalogapplication.RateLevel,
		levelID int64,
		rateType catalogapplication.RateType,
	) ([]catalogapplication.RateView, error)
}

func NewCatalogRateResolver(catalog CatalogRateQueries) *CatalogRateResolver {
	return &CatalogRateResolver{catalog: catalog}
}

func (resolver *CatalogRateResolver) GetWorkspaceBillableRate(
	ctx context.Context,
	workspaceID int64,
) (amountCents int, currency string, ok bool) {
	rates, err := resolver.catalog.GetRatesByLevel(
		ctx,
		workspaceID,
		catalogapplication.RateLevelWorkspace,
		workspaceID,
		catalogapplication.RateTypeBillable,
	)
	if err != nil || len(rates) == 0 {
		return 0, "USD", false
	}

	// Find the active rate (first without end date, or most recent).
	for _, rate := range rates {
		if rate.End == nil {
			return int(rate.Amount), "USD", rate.Amount > 0
		}
	}
	first := rates[0]
	return int(first.Amount), "USD", first.Amount > 0
}
