package domain

import "testing"

func TestCommercialAccountKeepsOrganizationAndWorkspaceViewsOnSingleTruth(t *testing.T) {
	subscription, err := NewSubscription(PlanPremium, SubscriptionStateActive)
	if err != nil {
		t.Fatalf("expected subscription to be valid: %v", err)
	}

	quota, err := NewQuotaWindow(77, 25, 120, 25)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	account, err := NewCommercialAccount(77, "cust_123", subscription, quota)
	if err != nil {
		t.Fatalf("expected commercial account to be valid: %v", err)
	}

	orgView := account.OrganizationStatus()
	workspaceView, err := account.WorkspaceStatus(501)
	if err != nil {
		t.Fatalf("expected workspace view to be valid: %v", err)
	}

	if orgView.OrganizationID != workspaceView.OrganizationID {
		t.Fatalf("expected workspace to point at same org truth, got %#v vs %#v", orgView, workspaceView)
	}

	if orgView.CustomerID != workspaceView.CustomerID {
		t.Fatalf("expected workspace to reuse same customer truth, got %#v vs %#v", orgView, workspaceView)
	}

	if orgView.Subscription != workspaceView.Subscription {
		t.Fatalf("expected workspace to reuse same subscription truth, got %#v vs %#v", orgView, workspaceView)
	}

	if orgView.WorkspaceID != nil {
		t.Fatalf("expected organization view to omit workspace id, got %v", *orgView.WorkspaceID)
	}

	if workspaceView.WorkspaceID == nil || *workspaceView.WorkspaceID != 501 {
		t.Fatalf("expected workspace view to expose workspace id 501, got %#v", workspaceView.WorkspaceID)
	}
}
