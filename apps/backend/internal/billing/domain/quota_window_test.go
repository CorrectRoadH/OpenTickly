package domain

import "testing"

func TestQuotaWindowExposesContractBodyAndHeaders(t *testing.T) {
	window, err := NewQuotaWindow(42, 9, 60, 10)
	if err != nil {
		t.Fatalf("expected quota window to be valid: %v", err)
	}

	if window.OrganizationID != 42 {
		t.Fatalf("expected organization id 42, got %d", window.OrganizationID)
	}

	if window.Remaining != 9 || window.ResetsInSeconds != 60 || window.Total != 10 {
		t.Fatalf("unexpected quota window values: %#v", window)
	}

	headers := window.Headers()
	if headers["X-Toggl-Quota-Remaining"] != "9" {
		t.Fatalf("expected remaining header 9, got %q", headers["X-Toggl-Quota-Remaining"])
	}

	if headers["X-Toggl-Quota-Resets-In"] != "60" {
		t.Fatalf(
			"expected reset header 60, got %q",
			headers["X-Toggl-Quota-Resets-In"],
		)
	}

	if headers["X-Toggl-Quota-Total"] != "10" {
		t.Fatalf("expected total header 10, got %q", headers["X-Toggl-Quota-Total"])
	}
}
