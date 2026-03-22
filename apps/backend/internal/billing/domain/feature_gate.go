package domain

type CapabilitySource string

const (
	CapabilitySourceBilling CapabilitySource = "billing"
)

type GateReason string

const (
	GateReasonAllowed          GateReason = "allowed"
	GateReasonPlanRestricted   GateReason = "plan_restricted"
	GateReasonQuotaExhausted   GateReason = "quota_exhausted"
	GateReasonInstanceDisabled GateReason = "instance_disabled"
)

type CapabilityContext struct {
	OrganizationID *int64 `json:"organization_id"`
	WorkspaceID    *int64 `json:"workspace_id"`
	Scope          string `json:"scope"`
}

type FeatureCapability struct {
	Key     string           `json:"key"`
	Enabled bool             `json:"enabled"`
	Source  CapabilitySource `json:"source"`
}

type CapabilitySnapshot struct {
	Context      CapabilityContext   `json:"context"`
	Capabilities []FeatureCapability `json:"capabilities"`
}

type FeatureGateDecision struct {
	CapabilityKey string       `json:"capability_key"`
	Allowed       bool         `json:"allowed"`
	Reason        GateReason   `json:"reason"`
	Quota         *QuotaWindow `json:"quota,omitempty"`
}

type CapabilityRule struct {
	Key           string
	MinimumPlan   Plan
	RequiresQuota bool
}

func (rule CapabilityRule) Evaluate(
	subscription Subscription,
	quota QuotaWindow,
	instanceDisabled bool,
) FeatureGateDecision {
	if instanceDisabled {
		return FeatureGateDecision{
			CapabilityKey: rule.Key,
			Allowed:       false,
			Reason:        GateReasonInstanceDisabled,
		}
	}
	if !subscription.HasPlanEntitlement(rule.MinimumPlan) {
		return FeatureGateDecision{
			CapabilityKey: rule.Key,
			Allowed:       false,
			Reason:        GateReasonPlanRestricted,
		}
	}
	if rule.RequiresQuota && quota.Exhausted() {
		return FeatureGateDecision{
			CapabilityKey: rule.Key,
			Allowed:       false,
			Reason:        GateReasonQuotaExhausted,
			Quota:         &quota,
		}
	}
	return FeatureGateDecision{
		CapabilityKey: rule.Key,
		Allowed:       true,
		Reason:        GateReasonAllowed,
		Quota:         &quota,
	}
}

func (rule CapabilityRule) Snapshot(subscription Subscription) FeatureCapability {
	return FeatureCapability{
		Key:     rule.Key,
		Enabled: subscription.HasPlanEntitlement(rule.MinimumPlan),
		Source:  CapabilitySourceBilling,
	}
}
