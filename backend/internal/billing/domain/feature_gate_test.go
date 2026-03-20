package domain

import "testing"

func TestCapabilityRuleEvaluateReturnsFormalGateFacts(t *testing.T) {
	subscription, err := NewSubscription(PlanStarter, SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}

	quota, err := NewQuotaWindow(42, 3, 60, 10)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	rule := CapabilityRule{
		Key:           "reports.summary",
		MinimumPlan:   PlanStarter,
		RequiresQuota: true,
	}

	allowed := rule.Evaluate(subscription, quota, false)
	if !allowed.Allowed || allowed.Reason != GateReasonAllowed {
		t.Fatalf("expected allowed gate decision, got %#v", allowed)
	}

	restricted := CapabilityRule{
		Key:         "reports.profitability",
		MinimumPlan: PlanEnterprise,
	}.Evaluate(subscription, quota, false)
	if restricted.Allowed || restricted.Reason != GateReasonPlanRestricted {
		t.Fatalf("expected plan restriction, got %#v", restricted)
	}

	exhaustedQuota, err := NewQuotaWindow(42, 0, 60, 10)
	if err != nil {
		t.Fatalf("expected exhausted quota window to be valid: %v", err)
	}

	exhausted := rule.Evaluate(subscription, exhaustedQuota, false)
	if exhausted.Allowed || exhausted.Reason != GateReasonQuotaExhausted {
		t.Fatalf("expected quota exhaustion, got %#v", exhausted)
	}
	if exhausted.Quota == nil || exhausted.Quota.Remaining != 0 {
		t.Fatalf("expected quota details to be preserved on exhausted decision, got %#v", exhausted)
	}

	disabled := rule.Evaluate(subscription, quota, true)
	if disabled.Allowed || disabled.Reason != GateReasonInstanceDisabled {
		t.Fatalf("expected instance disable decision, got %#v", disabled)
	}
}
