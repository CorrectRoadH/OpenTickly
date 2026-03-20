package bootstrap

import httpapp "opentoggl/backend/apps/backend/internal/http"

func newWave1WebHandlers() (*httpapp.Wave1WebHandlers, error) {
	return httpapp.NewWave1WebHandlers(), nil
}
