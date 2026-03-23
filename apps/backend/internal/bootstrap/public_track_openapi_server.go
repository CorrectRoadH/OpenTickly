package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
)

type bootstrapPublicTrackOpenAPIServer struct {
	*publicTrackUnimplementedServer
	runtime *webRuntime
}

func newBootstrapPublicTrackOpenAPIServer(runtime *webRuntime) publictrackapi.ServerInterface {
	return &bootstrapPublicTrackOpenAPIServer{
		publicTrackUnimplementedServer: &publicTrackUnimplementedServer{},
		runtime:                        runtime,
	}
}
