package domain

import "testing"

func TestNewSubscriptionRejectsUnknownState(t *testing.T) {
	if _, err := NewSubscription(PlanStarter, SubscriptionState("unknown")); err == nil {
		t.Fatal("expected unknown subscription state to be rejected")
	}
}

func TestSubscriptionHasEntitlementForPaidPlansWhileActiveOrTrialing(t *testing.T) {
	active, err := NewSubscription(PlanStarter, SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected active starter subscription to be valid: %v", err)
	}

	trialing, err := NewSubscription(PlanStarter, SubscriptionStateTrialing)
	if err != nil {
		t.Fatalf("expected trialing starter subscription to be valid: %v", err)
	}

	canceled, err := NewSubscription(PlanStarter, SubscriptionStateCanceled)
	if err != nil {
		t.Fatalf("expected canceled starter subscription to be valid: %v", err)
	}

	if !active.HasPlanEntitlement(PlanStarter) {
		t.Fatal("expected active subscription to satisfy its own plan entitlement")
	}

	if !trialing.HasPlanEntitlement(PlanStarter) {
		t.Fatal("expected trialing subscription to keep paid entitlement")
	}

	if canceled.HasPlanEntitlement(PlanStarter) {
		t.Fatal("expected canceled subscription to lose paid entitlement")
	}

	if !canceled.HasPlanEntitlement(PlanFree) {
		t.Fatal("expected every subscription state to retain free-plan entitlement")
	}
}
