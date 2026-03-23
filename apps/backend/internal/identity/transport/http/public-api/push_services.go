package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *PublicTrackHandler) GetPublicTrackPushServices(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	tokens, listErr := handler.identity.service.ListPushServices(ctx.Request().Context(), user.ID)
	if listErr != nil {
		response := mapError(listErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}

	response := make([]string, 0, len(tokens))
	for _, token := range tokens {
		response = append(response, token.Token().String())
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *PublicTrackHandler) PostPublicTrackPushServices(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.PushPostPushServicesSubscribe
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if _, registerErr := handler.identity.service.RegisterPushService(
		ctx.Request().Context(),
		user.ID,
		lo.FromPtr(request.FcmRegistrationToken),
	); registerErr != nil {
		response := mapError(registerErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *PublicTrackHandler) DeletePublicTrackPushServices(ctx echo.Context) error {
	user, err := handler.resolvePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.PushDeletePushServicesUnsubscribe
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if deleteErr := handler.identity.service.DeletePushService(
		ctx.Request().Context(),
		user.ID,
		lo.FromPtr(request.FcmRegistrationToken),
	); deleteErr != nil {
		response := mapError(deleteErr)
		return ctx.JSON(response.StatusCode, response.Body)
	}
	return ctx.JSON(http.StatusOK, "OK")
}
