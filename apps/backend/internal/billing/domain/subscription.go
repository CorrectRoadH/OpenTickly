package domain

import "fmt"

type Plan string

const (
	PlanFree       Plan = "free"
	PlanStarter    Plan = "starter"
	PlanPremium    Plan = "premium"
	PlanEnterprise Plan = "enterprise"
)

type SubscriptionState string

const (
	SubscriptionStateFree     SubscriptionState = "free"
	SubscriptionStateActive   SubscriptionState = "active"
	SubscriptionStateTrialing SubscriptionState = "trialing"
	SubscriptionStatePastDue  SubscriptionState = "past_due"
	SubscriptionStateCanceled SubscriptionState = "canceled"
)

type Subscription struct {
	Plan  Plan
	State SubscriptionState
}

func NewSubscription(plan Plan, state SubscriptionState) (Subscription, error) {
	if !plan.isValid() {
		return Subscription{}, fmt.Errorf("billing plan must be known")
	}
	if !state.isValid() {
		return Subscription{}, fmt.Errorf("subscription state must be known")
	}
	return Subscription{Plan: plan, State: state}, nil
}

// HasPlanEntitlement keeps the billing truth in one place so tenant and other
// modules do not need to copy plan-vs-state rules when they ask billing.
func (subscription Subscription) HasPlanEntitlement(required Plan) bool {
	if required == PlanFree {
		return true
	}
	if !subscription.State.keepsPaidEntitlement() {
		return false
	}
	return subscription.Plan.rank() >= required.rank()
}

func (plan Plan) isValid() bool {
	switch plan {
	case PlanFree, PlanStarter, PlanPremium, PlanEnterprise:
		return true
	default:
		return false
	}
}

func (plan Plan) rank() int {
	switch plan {
	case PlanFree:
		return 0
	case PlanStarter:
		return 1
	case PlanPremium:
		return 2
	case PlanEnterprise:
		return 3
	default:
		return -1
	}
}

func (state SubscriptionState) isValid() bool {
	switch state {
	case SubscriptionStateFree,
		SubscriptionStateActive,
		SubscriptionStateTrialing,
		SubscriptionStatePastDue,
		SubscriptionStateCanceled:
		return true
	default:
		return false
	}
}

func (state SubscriptionState) keepsPaidEntitlement() bool {
	switch state {
	case SubscriptionStateActive, SubscriptionStateTrialing, SubscriptionStatePastDue:
		return true
	default:
		return false
	}
}
