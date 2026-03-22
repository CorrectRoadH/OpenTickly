package httpapp

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
)

type webOpenAPIServer struct {
	handlers *WebHandlers
}

func newWebOpenAPIServer(handlers *WebHandlers) webapi.ServerInterface {
	return &webOpenAPIServer{handlers: handlers}
}
