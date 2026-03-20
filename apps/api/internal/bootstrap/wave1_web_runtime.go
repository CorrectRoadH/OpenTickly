package bootstrap

import httpapp "opentoggl/backend/apps/api/internal/http"

func newWave1WebHandlers() (*httpapp.Wave1WebHandlers, error) {
	return httpapp.NewWave1WebHandlers(), nil
}
