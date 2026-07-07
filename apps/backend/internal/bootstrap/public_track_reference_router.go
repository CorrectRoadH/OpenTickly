package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetStatus(ctx echo.Context) error {
	return server.reference.GetStatus(ctx)
}

func (server *publicTrackOpenAPIServer) GetCountries(ctx echo.Context) error {
	return server.reference.GetCountries(ctx)
}

func (server *publicTrackOpenAPIServer) GetCountriesCountryIdSubdivisions(ctx echo.Context, countryId int) error {
	return server.reference.GetCountriesCountryIdSubdivisions(ctx, countryId)
}

func (server *publicTrackOpenAPIServer) GetCurrencies(ctx echo.Context) error {
	return server.reference.GetCurrencies(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimezones(ctx echo.Context) error {
	return server.reference.GetTimezones(ctx)
}

func (server *publicTrackOpenAPIServer) GetOffsets(ctx echo.Context) error {
	return server.reference.GetOffsets(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceCurrencies(ctx echo.Context, workspaceId int) error {
	return server.reference.GetWorkspaceCurrencies(ctx, workspaceId)
}

func (server *publicTrackOpenAPIServer) GetKeys(ctx echo.Context) error {
	return server.reference.GetKeys(ctx)
}
