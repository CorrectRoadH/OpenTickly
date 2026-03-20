package domain

import "testing"

func TestNewProject(t *testing.T) {
	p := NewProject(1, 2, "Project Alpha", true, false)

	if p.ID != 1 {
		t.Fatalf("expected ID 1, got %d", p.ID)
	}
	if p.WorkspaceID != 2 {
		t.Fatalf("expected WorkspaceID 2, got %d", p.WorkspaceID)
	}
	if p.Name != "Project Alpha" {
		t.Fatalf("expected Name 'Project Alpha', got %q", p.Name)
	}
	if !p.Private {
		t.Fatalf("expected Private true, got false")
	}
	if p.Archived {
		t.Fatalf("expected Archived false, got true")
	}
}

func TestArchive(t *testing.T) {
	p := NewProject(1, 2, "Project Beta", false, false)

	p.Archive()

	if !p.Archived {
		t.Fatalf("expected Archived true after Archive()")
	}
}

func TestRestore(t *testing.T) {
	p := NewProject(1, 2, "Project Gamma", false, true)

	p.Restore()

	if p.Archived {
		t.Fatalf("expected Archived false after Restore()")
	}
}
