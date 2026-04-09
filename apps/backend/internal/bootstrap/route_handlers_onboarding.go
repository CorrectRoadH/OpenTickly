package bootstrap

import (
	"context"
	"errors"
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) getOnboarding(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}

	completed, err := handlers.getOnboardingCompleted(ctx.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, webapi.OnboardingStatus{
		Completed: completed,
	})
}

func (handlers *routeHandlers) completeOnboarding(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}

	var request webapi.CompleteOnboardingRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := handlers.applyOnboardingComplete(ctx.Request().Context(), user.ID, request); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, webapi.OnboardingStatus{
		Completed: true,
	})
}

func (handlers *routeHandlers) resetOnboarding(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}

	_, err = handlers.pool.Exec(ctx.Request().Context(),
		`DELETE FROM user_onboarding WHERE user_id = $1`,
		user.ID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	return ctx.JSON(http.StatusOK, webapi.OnboardingStatus{
		Completed: false,
	})
}

func (handlers *routeHandlers) getOnboardingCompleted(ctx context.Context, userID int64) (bool, error) {
	row := handlers.pool.QueryRow(ctx,
		`SELECT 1 FROM user_onboarding WHERE user_id = $1`,
		userID,
	)

	var exists int
	err := row.Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (handlers *routeHandlers) applyOnboardingComplete(ctx context.Context, userID int64, request webapi.CompleteOnboardingRequest) error {
	_, err := handlers.pool.Exec(ctx,
		`INSERT INTO user_onboarding (user_id, version)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET version = $2, completed_at = now()`,
		userID, request.Version,
	)
	if err != nil {
		return err
	}

	if request.LanguageCode != nil && *request.LanguageCode != "" {
		if updateErr := handlers.identityApp.UpdatePreferences(ctx, userID, "web", identitydomain.Preferences{
			LanguageCode: *request.LanguageCode,
		}); updateErr != nil {
			return updateErr
		}
	}

	return nil
}
