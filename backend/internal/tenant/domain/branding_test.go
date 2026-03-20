package domain

import "testing"

func TestNewBrandingAssetRejectsUnknownKind(t *testing.T) {
	if _, err := NewBrandingAsset("banner", "tenant/workspaces/12/banner.png"); err == nil {
		t.Fatal("expected unsupported branding kind to be rejected")
	}
}

func TestNewBrandingAssetRejectsBlankStorageKey(t *testing.T) {
	if _, err := NewBrandingAsset(BrandingAssetKindLogo, "   "); err == nil {
		t.Fatal("expected blank branding storage key to be rejected")
	}
}

func TestWorkspaceBrandingReplacesAssetsByKind(t *testing.T) {
	logo, err := NewBrandingAsset(BrandingAssetKindLogo, "tenant/workspaces/12/logo.png")
	if err != nil {
		t.Fatalf("expected logo asset to be valid: %v", err)
	}

	avatar, err := NewBrandingAsset(BrandingAssetKindAvatar, "tenant/workspaces/12/avatar.png")
	if err != nil {
		t.Fatalf("expected avatar asset to be valid: %v", err)
	}

	branding := WorkspaceBranding{}.WithAsset(logo).WithAsset(avatar)

	if got, ok := branding.Asset(BrandingAssetKindLogo); !ok || got.StorageKey() != "tenant/workspaces/12/logo.png" {
		t.Fatalf("expected logo asset to round-trip, got %+v %v", got, ok)
	}

	if got, ok := branding.Asset(BrandingAssetKindAvatar); !ok || got.StorageKey() != "tenant/workspaces/12/avatar.png" {
		t.Fatalf("expected avatar asset to round-trip, got %+v %v", got, ok)
	}
}
