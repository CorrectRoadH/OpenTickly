package postgres

import (
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestSequenceNextUserIDUsesCurrentIdentityUsersSerialSequence(t *testing.T) {
	database := pgtest.Open(t)
	sequence := NewSequence(database.Pool)

	first, err := sequence.NextUserID()
	if err != nil {
		t.Fatalf("first NextUserID: %v", err)
	}
	second, err := sequence.NextUserID()
	if err != nil {
		t.Fatalf("second NextUserID: %v", err)
	}

	if first != 1 {
		t.Fatalf("expected first user id 1, got %d", first)
	}
	if second != 2 {
		t.Fatalf("expected second user id 2, got %d", second)
	}
}
