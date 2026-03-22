package httpapp

func NewWebRouteRegistrar(handlers *WebHandlers) RouteRegistrar {
	registrar, err := NewGeneratedWebRouteRegistrar(newWebOpenAPIServer(handlers))
	if err != nil {
		panic(err)
	}

	return registrar
}
