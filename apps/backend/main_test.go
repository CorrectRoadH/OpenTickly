package main

import "testing"

func TestCommandNameDefaultsToServe(t *testing.T) {
	if got := commandName(nil); got != "serve" {
		t.Fatalf("expected default command %q, got %q", "serve", got)
	}
}

func TestRunRejectsUnknownCommand(t *testing.T) {
	err := run([]string{"unknown"})
	if err == nil {
		t.Fatal("expected unknown command error")
	}
}
