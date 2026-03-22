package domain

import "testing"

func TestNormalizeOrganizationNameTrimsWhitespaceWithoutPlaceholderEntity(t *testing.T) {
	name, err := NormalizeOrganizationName("  Platform Org  ")
	if err != nil {
		t.Fatalf("expected organization name to normalize: %v", err)
	}
	if name != "Platform Org" {
		t.Fatalf("expected trimmed organization name, got %q", name)
	}
}

func TestNormalizeWorkspaceNameRejectsBlankValuesWithoutPlaceholderEntity(t *testing.T) {
	if _, err := NormalizeWorkspaceName("   "); err == nil {
		t.Fatal("expected blank workspace name to be rejected")
	}
}
