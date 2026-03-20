package application

import (
    "testing"

    "opentoggl/backend/backend/internal/catalog/domain"
)

func TestCatalogService_CreateAndGetProject(t *testing.T) {
    svc := NewCatalogService()
    project := domain.NewProject(1, 10, "Proj", false, false)

    if err := svc.CreateProject(project); err != nil {
        t.Fatalf("CreateProject error: %v", err)
    }

    got, err := svc.GetProject(1)
    if err != nil {
        t.Fatalf("GetProject error: %v", err)
    }

    if got != project {
        t.Fatalf("expected %v, got %v", project, got)
    }
}

func TestCatalogService_CreateDuplicate(t *testing.T) {
    svc := NewCatalogService()
    project := domain.NewProject(1, 10, "Proj", false, false)

    if err := svc.CreateProject(project); err != nil {
        t.Fatalf("CreateProject first call error: %v", err)
    }

    if err := svc.CreateProject(project); err == nil {
        t.Fatalf("expected error on duplicate project creation")
    }
}

func TestCatalogService_ArchiveAndRestore(t *testing.T) {
    svc := NewCatalogService()
    project := domain.NewProject(2, 10, "Proj2", false, false)
    _ = svc.CreateProject(project)

    if err := svc.ArchiveProject(2); err != nil {
        t.Fatalf("ArchiveProject error: %v", err)
    }

    got, err := svc.GetProject(2)
    if err != nil {
        t.Fatalf("GetProject error after archive: %v", err)
    }
    if !got.Archived {
        t.Fatalf("expected project archived flag true after archive")
    }

    if err := svc.RestoreProject(2); err != nil {
        t.Fatalf("RestoreProject error: %v", err)
    }

    got, err = svc.GetProject(2)
    if err != nil {
        t.Fatalf("GetProject error after restore: %v", err)
    }
    if got.Archived {
        t.Fatalf("expected project archived flag false after restore")
    }
}

func TestCatalogService_PrivateProjectMembers(t *testing.T) {
    svc := NewCatalogService()
    privateProject := domain.NewProject(3, 10, "Private", true, false)
    _ = svc.CreateProject(privateProject)

    // Add members
    if err := svc.AddProjectMember(3, 101); err != nil {
        t.Fatalf("AddProjectMember error: %v", err)
    }
    if err := svc.AddProjectMember(3, 102); err != nil {
        t.Fatalf("AddProjectMember error: %v", err)
    }

    members := svc.ListProjectMembers(3)
    if len(members) != 2 {
        t.Fatalf("expected 2 members, got %d", len(members))
    }

    if !svc.CanViewProject(3, 101) || !svc.CanViewProject(3, 102) {
        t.Fatalf("expected added members to view private project")
    }
    if svc.CanViewProject(3, 103) {
        t.Fatalf("expected non-member cannot view private project")
    }

    // Remove member
    if err := svc.RemoveProjectMember(3, 101); err != nil {
        t.Fatalf("RemoveProjectMember error: %v", err)
    }

    if svc.CanViewProject(3, 101) {
        t.Fatalf("expected removed member cannot view private project")
    }
}

func TestCatalogService_PublicProjectVisibility(t *testing.T) {
    svc := NewCatalogService()
    publicProject := domain.NewProject(4, 10, "Public", false, false)
    _ = svc.CreateProject(publicProject)

    if !svc.CanViewProject(4, 0) {
        t.Fatalf("expected anyone can view public project")
    }

    if err := svc.AddProjectMember(4, 200); err != nil {
        t.Fatalf("AddProjectMember should be no-op for public project: %v", err)
    }

    if err := svc.RemoveProjectMember(4, 200); err != nil {
        t.Fatalf("RemoveProjectMember should be no-op for public project: %v", err)
    }

    members := svc.ListProjectMembers(4)
    if len(members) != 0 {
        t.Fatalf("expected no members tracked for public project, got %d", len(members))
    }
}
