package httpapp

import "context"

type generatedWave1WebAuthSessionAdapter struct {
	handlers *Wave1WebHandlers
}

func newGeneratedWave1WebAuthSessionAdapter(
	handlers *Wave1WebHandlers,
) GeneratedWave1WebAuthSessionHandler {
	return &generatedWave1WebAuthSessionAdapter{handlers: handlers}
}

func (adapter *generatedWave1WebAuthSessionAdapter) RegisterWebUser(
	ctx context.Context,
	request RegisterWebUserRequestBody,
) Wave1Response {
	registerRequest := RegisterRequest{
		Email:    request.Email,
		Password: request.Password,
	}
	if request.Fullname != nil {
		registerRequest.FullName = *request.Fullname
	}
	return adapter.handlers.Register(ctx, registerRequest)
}

func (adapter *generatedWave1WebAuthSessionAdapter) LoginWebUser(
	ctx context.Context,
	request LoginWebUserRequestBody,
) Wave1Response {
	return adapter.handlers.Login(ctx, LoginRequest{
		Email:    request.Email,
		Password: request.Password,
	})
}

func (adapter *generatedWave1WebAuthSessionAdapter) LogoutWebUser(
	ctx context.Context,
	sessionID string,
) Wave1Response {
	return adapter.handlers.Logout(ctx, sessionID)
}

func (adapter *generatedWave1WebAuthSessionAdapter) GetWebSession(
	ctx context.Context,
	sessionID string,
) Wave1Response {
	return adapter.handlers.GetSession(ctx, sessionID)
}
