package httpapp

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

func (server *webOpenAPIServer) RegisterWebUser(ctx echo.Context) error {
	var request webapi.RegisterRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	registerRequest := RegisterRequest{
		Email:    string(request.Email),
		Password: request.Password,
	}
	if request.Fullname != nil {
		registerRequest.FullName = *request.Fullname
	}

	return writeWebResponse(
		ctx,
		server.handlers.Register(ctx.Request().Context(), registerRequest),
	)
}

func (server *webOpenAPIServer) LoginWebUser(ctx echo.Context) error {
	var request webapi.LoginRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(ctx, server.handlers.Login(ctx.Request().Context(), LoginRequest{
		Email:    string(request.Email),
		Password: request.Password,
	}))
}

func (server *webOpenAPIServer) LogoutWebUser(ctx echo.Context) error {
	return writeWebResponse(ctx, server.handlers.Logout(ctx.Request().Context(), sessionID(ctx)))
}

func (server *webOpenAPIServer) GetWebSession(ctx echo.Context) error {
	return writeWebResponse(ctx, server.handlers.GetSession(ctx.Request().Context(), sessionID(ctx)))
}

func (server *webOpenAPIServer) GetCurrentUserProfile(ctx echo.Context) error {
	return writeWebResponse(ctx, server.handlers.GetProfile(ctx.Request().Context(), sessionID(ctx)))
}

func (server *webOpenAPIServer) UpdateCurrentUserProfile(ctx echo.Context) error {
	var request webapi.UpdateCurrentUserProfileRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	profileRequest := ProfileRequest{
		Email:              string(request.Email),
		FullName:           request.Fullname,
		Timezone:           request.Timezone,
		BeginningOfWeek:    &request.BeginningOfWeek,
		CountryID:          int64PointerFromIntPointer(&request.CountryId),
		DefaultWorkspaceID: int64PointerFromIntPointer(&request.DefaultWorkspaceId),
	}
	if request.CurrentPassword != nil {
		profileRequest.CurrentPassword = *request.CurrentPassword
	}
	if request.Password != nil {
		profileRequest.Password = *request.Password
	}

	return writeWebResponse(
		ctx,
		server.handlers.UpdateProfile(ctx.Request().Context(), sessionID(ctx), profileRequest),
	)
}

func (server *webOpenAPIServer) ResetCurrentUserApiToken(ctx echo.Context) error {
	return writeWebResponse(ctx, server.handlers.ResetAPIToken(ctx.Request().Context(), sessionID(ctx)))
}

func (server *webOpenAPIServer) GetCurrentUserPreferences(ctx echo.Context) error {
	return writeWebResponse(ctx, server.handlers.GetPreferences(ctx.Request().Context(), sessionID(ctx)))
}

func (server *webOpenAPIServer) UpdateCurrentUserPreferences(ctx echo.Context) error {
	var request webapi.UserPreferencesUpdate
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(ctx, server.handlers.UpdatePreferences(ctx.Request().Context(), sessionID(ctx), PreferencesRequest{
		DateFormat:          request.DateFormat,
		TimeOfDayFormat:     request.TimeofdayFormat,
		DurationFormat:      request.DurationFormat,
		PGTimeZoneName:      request.PgTimeZoneName,
		BeginningOfWeek:     request.BeginningOfWeek,
		CollapseTimeEntries: request.CollapseTimeEntries,
		LanguageCode:        request.LanguageCode,
		HideSidebarRight:    request.HideSidebarRight,
		ReportsCollapse:     request.ReportsCollapse,
		ManualMode:          request.ManualMode,
		ManualEntryMode:     request.ManualEntryMode,
	}))
}
