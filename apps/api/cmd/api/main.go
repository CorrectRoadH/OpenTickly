package main

import (
	"log"

	"opentoggl/backend/apps/api/internal/bootstrap"
)

func main() {
	app, err := bootstrap.NewApp(bootstrap.ConfigFromEnvironment(nil))
	if err != nil {
		log.Fatalf("bootstrap api runtime: %v", err)
	}

	if err := app.Start(); err != nil {
		log.Fatalf("start api runtime: %v", err)
	}
}
