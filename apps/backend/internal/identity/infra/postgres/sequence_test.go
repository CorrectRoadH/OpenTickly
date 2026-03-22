package postgres

import (
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestSequenceNextUserIDUsesCurrentIdentityUsersSerialSequence(t *testing.T) {
	database := pgtest.Open(t)
	sequence := NewSequence(database.Pool)

	first := sequence.NextUserID()
	second := sequence.NextUserID()

	if first != 1 {
		t.Fatalf("expected first user id 1, got %d", first)
	}
	if second != 2 {
		t.Fatalf("expected second user id 2, got %d", second)
	}
}
