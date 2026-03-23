package web

import (
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	sharedapi "opentoggl/backend/apps/backend/internal/http/generated/shared"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
)

func CapabilitySnapshotToWeb(snapshot billingdomain.CapabilitySnapshot) webapi.CapabilitySnapshot {
	capabilities := make([]sharedapi.FeatureCapability, 0, len(snapshot.Capabilities))
	for _, capability := range snapshot.Capabilities {
		capabilities = append(capabilities, sharedapi.FeatureCapability{
			Enabled: capability.Enabled,
			Key:     capability.Key,
			Source:  sharedapi.FeatureCapabilitySource(capability.Source),
		})
	}

	return webapi.CapabilitySnapshot{
		Capabilities: capabilities,
		Context: sharedapi.CapabilityContext{
			OrganizationId: intPointerFromInt64(snapshot.Context.OrganizationID),
			Scope:          sharedapi.CapabilityContextScope(snapshot.Context.Scope),
			WorkspaceId:    intPointerFromInt64(snapshot.Context.WorkspaceID),
		},
	}
}

func QuotaWindowToWeb(window billingdomain.QuotaWindow) webapi.QuotaWindow {
	return webapi.QuotaWindow{
		OrganizationId: intPointerFromInt64(&window.OrganizationID),
		Remaining:      window.Remaining,
		ResetsInSecs:   window.ResetsInSeconds,
		Total:          window.Total,
	}
}

func intPointerFromInt64(value *int64) *int {
	if value == nil {
		return nil
	}
	converted := int(*value)
	return &converted
}
