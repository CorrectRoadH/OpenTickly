package httpapp

import "context"

type generatedWebAuthSessionAdapter struct {
	handlers *WebHandlers
}

func newGeneratedWebAuthSessionAdapter(
	handlers *WebHandlers,
) GeneratedWebAuthSessionHandler {
	return &generatedWebAuthSessionAdapter{handlers: handlers}
}

func (adapter *generatedWebAuthSessionAdapter) RegisterWebUser(
	ctx context.Context,
	request RegisterWebUserRequestBody,
) WebResponse {
	registerRequest := RegisterRequest{
		Email:    request.Email,
		Password: request.Password,
	}
	if request.Fullname != nil {
		registerRequest.FullName = *request.Fullname
	}
	return adapter.handlers.Register(ctx, registerRequest)
}

func (adapter *generatedWebAuthSessionAdapter) LoginWebUser(
	ctx context.Context,
	request LoginWebUserRequestBody,
) WebResponse {
	return adapter.handlers.Login(ctx, LoginRequest{
		Email:    request.Email,
		Password: request.Password,
	})
}

func (adapter *generatedWebAuthSessionAdapter) LogoutWebUser(
	ctx context.Context,
	sessionID string,
) WebResponse {
	return adapter.handlers.Logout(ctx, sessionID)
}

func (adapter *generatedWebAuthSessionAdapter) GetWebSession(
	ctx context.Context,
	sessionID string,
) WebResponse {
	return adapter.handlers.GetSession(ctx, sessionID)
}
