package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	platformapplication "opentoggl/backend/apps/backend/internal/platform/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	references *platformapplication.ReferenceService
	scope      ScopeAuthorizer
}

func NewHandler(references *platformapplication.ReferenceService, scope ScopeAuthorizer) *Handler {
	return &Handler{
		references: references,
		scope:      scope,
	}
}

func (handler *Handler) GetStatus(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (handler *Handler) GetCountries(ctx echo.Context) error {
	countries := make([]publictrackapi.ModelsCountry, 0, len(handler.references.Countries()))
	for _, country := range handler.references.Countries() {
		countries = append(countries, publictrackapi.ModelsCountry{
			CountryCode: lo.ToPtr(country.Code),
			Id:          lo.ToPtr(country.ID),
			Name:        lo.ToPtr(country.Name),
		})
	}
	return ctx.JSON(http.StatusOK, countries)
}

func (handler *Handler) GetCountriesCountryIdSubdivisions(ctx echo.Context, countryId int) error {
	_ = countryId
	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsSubdivision{})
}

func (handler *Handler) GetCurrencies(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, currenciesToAPI(handler.references.Currencies()))
}

func (handler *Handler) GetTimezones(ctx echo.Context) error {
	timezones := make([]publictrackapi.ModelsTimezone, 0, len(handler.references.Timezones()))
	for _, timezone := range handler.references.Timezones() {
		timezones = append(timezones, publictrackapi.ModelsTimezone{
			Name: lo.ToPtr(timezone.Name),
			Utc:  lo.ToPtr(timezone.UTC),
		})
	}
	return ctx.JSON(http.StatusOK, timezones)
}

func (handler *Handler) GetOffsets(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, handler.references.Offsets())
}

func (handler *Handler) GetKeys(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, map[string]any{
		"keys": []any{},
	})
}

func (handler *Handler) GetWorkspaceCurrencies(ctx echo.Context, workspaceID int) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, int64(workspaceID)); err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, currenciesToAPI(handler.references.Currencies()))
}

func currenciesToAPI(currencies []platformapplication.Currency) []publictrackapi.ModelsCurrency {
	response := make([]publictrackapi.ModelsCurrency, 0, len(currencies))
	for _, currency := range currencies {
		response = append(response, publictrackapi.ModelsCurrency{
			CurrencyId: lo.ToPtr(currency.ID),
			IsoCode:    lo.ToPtr(currency.ISOCode),
			Symbol:     lo.ToPtr(currency.Symbol),
		})
	}
	return response
}
