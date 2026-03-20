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
	OrganizationID *int64
	WorkspaceID    *int64
	Scope          string
}

type FeatureCapability struct {
	Key     string
	Enabled bool
	Source  CapabilitySource
}

type CapabilitySnapshot struct {
	Context      CapabilityContext
	Capabilities []FeatureCapability
}

type FeatureGateDecision struct {
	CapabilityKey string
	Allowed       bool
	Reason        GateReason
	Quota         *QuotaWindow
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
