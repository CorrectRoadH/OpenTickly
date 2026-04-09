package bootstrap

import (
	"errors"
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) register(ctx echo.Context) error {
	var request identityweb.RegisterRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := handlers.identity.Register(ctx.Request().Context(), request)
	if response.StatusCode == http.StatusCreated {
		if err := maybeBootstrapFirstUser(ctx.Request().Context(), handlers.pool, request.Email); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}
	return handlers.writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) login(ctx echo.Context) error {
	var request identityweb.LoginRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return handlers.writeIdentityResponse(ctx, handlers.identity.Login(ctx.Request().Context(), request))
}

func (handlers *routeHandlers) logout(ctx echo.Context) error {
	response := handlers.identity.Logout(ctx.Request().Context(), sessionID(ctx))
	return handlers.writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) session(ctx echo.Context) error {
	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	return handlers.writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) updateSession(ctx echo.Context) error {
	var request webapi.UpdateWebSessionRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if request.WorkspaceId <= 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		switch {
		case errors.Is(err, identityapplication.ErrSessionNotFound),
			errors.Is(err, identitydomain.ErrUserDeactivated),
			errors.Is(err, identitydomain.ErrUserDeleted):
			return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}

	workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	var selectedWorkspace *tenantapplication.WorkspaceView
	for index := range workspaces {
		if int64(workspaces[index].ID) == int64(request.WorkspaceId) {
			selectedWorkspace = &workspaces[index]
			break
		}
	}
	if selectedWorkspace == nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(errors.New("requested workspace is not accessible to the current user"))
	}

	if err := handlers.userHomes.Save(
		ctx.Request().Context(),
		user.ID,
		int64(selectedWorkspace.OrganizationID),
		int64(selectedWorkspace.ID),
	); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	return handlers.writeIdentityResponse(ctx, response)
}
