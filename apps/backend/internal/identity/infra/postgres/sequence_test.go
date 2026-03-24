package postgres

import (
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// TestSequenceNextUserIDUsesCurrentIdentityUsersSerialSequence tests the sequence
// behavior directly. It requires full schema isolation since it tests that the
// sequence starts from 1, which would conflict with other tests using the shared
// schema. This is a legitimate case for OpenEphemeral().
func TestSequenceNextUserIDUsesCurrentIdentityUsersSerialSequence(t *testing.T) {
	database := pgtest.OpenEphemeral(t)
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
