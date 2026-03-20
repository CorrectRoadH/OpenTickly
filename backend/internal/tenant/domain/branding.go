package domain

import (
	"fmt"
	"strings"
)

type BrandingAssetKind string

const (
	BrandingAssetKindLogo   BrandingAssetKind = "logo"
	BrandingAssetKindAvatar BrandingAssetKind = "avatar"
)

type BrandingAsset struct {
	kind       BrandingAssetKind
	storageKey string
}

func NewBrandingAsset(kind BrandingAssetKind, storageKey string) (BrandingAsset, error) {
	if kind != BrandingAssetKindLogo && kind != BrandingAssetKindAvatar {
		return BrandingAsset{}, fmt.Errorf("branding asset kind %q is not supported", kind)
	}

	normalizedStorageKey := strings.TrimSpace(storageKey)
	if normalizedStorageKey == "" {
		return BrandingAsset{}, fmt.Errorf("branding asset storage key is required")
	}

	return BrandingAsset{
		kind:       kind,
		storageKey: normalizedStorageKey,
	}, nil
}

func (asset BrandingAsset) Kind() BrandingAssetKind {
	return asset.kind
}

func (asset BrandingAsset) StorageKey() string {
	return asset.storageKey
}

type WorkspaceBranding struct {
	logo   *BrandingAsset
	avatar *BrandingAsset
}

func (branding WorkspaceBranding) WithAsset(asset BrandingAsset) WorkspaceBranding {
	// 这里不用 map，是为了让值对象复制保持直观，避免在测试里出现共享底层引用导致的假阳性。
	switch asset.Kind() {
	case BrandingAssetKindLogo:
		branding.logo = &asset
	case BrandingAssetKindAvatar:
		branding.avatar = &asset
	}

	return branding
}

func (branding WorkspaceBranding) Asset(kind BrandingAssetKind) (BrandingAsset, bool) {
	switch kind {
	case BrandingAssetKindLogo:
		if branding.logo == nil {
			return BrandingAsset{}, false
		}
		return *branding.logo, true
	case BrandingAssetKindAvatar:
		if branding.avatar == nil {
			return BrandingAsset{}, false
		}
		return *branding.avatar, true
	default:
		return BrandingAsset{}, false
	}
}
