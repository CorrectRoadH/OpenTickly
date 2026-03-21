package main

import (
	"log"

	"opentoggl/backend/apps/backend/internal/bootstrap"
)

func main() {
	app, err := bootstrap.NewAppFromEnvironment(nil)
	if err != nil {
		log.Fatalf("bootstrap api runtime: %v", err)
	}

	if err := app.Start(); err != nil {
		log.Fatalf("start api runtime: %v", err)
	}
}
