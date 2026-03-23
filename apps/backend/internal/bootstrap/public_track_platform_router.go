package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetStatus(ctx echo.Context) error {
	return server.platform.GetStatus(ctx)
}

func (server *publicTrackOpenAPIServer) GetCountries(ctx echo.Context) error {
	return server.platform.GetCountries(ctx)
}

func (server *publicTrackOpenAPIServer) GetCountriesCountryIdSubdivisions(
	ctx echo.Context,
	countryId int,
) error {
	return server.platform.GetCountriesCountryIdSubdivisions(ctx, countryId)
}

func (server *publicTrackOpenAPIServer) GetCurrencies(ctx echo.Context) error {
	return server.platform.GetCurrencies(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimezones(ctx echo.Context) error {
	return server.platform.GetTimezones(ctx)
}

func (server *publicTrackOpenAPIServer) GetOffsets(ctx echo.Context) error {
	return server.platform.GetOffsets(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceCurrencies(ctx echo.Context, workspaceId int) error {
	return server.platform.GetWorkspaceCurrencies(ctx, workspaceId)
}
