package domain

import (
	"fmt"
	"strconv"
)

type QuotaWindow struct {
	OrganizationID  int64 `json:"organization_id"`
	Remaining       int   `json:"remaining"`
	ResetsInSeconds int   `json:"resets_in_secs"`
	Total           int   `json:"total"`
}

func NewQuotaWindow(
	organizationID int64,
	remaining int,
	resetsInSeconds int,
	total int,
) (QuotaWindow, error) {
	if organizationID <= 0 {
		return QuotaWindow{}, fmt.Errorf("organization id must be positive")
	}
	if resetsInSeconds < 0 {
		return QuotaWindow{}, fmt.Errorf("quota reset seconds must not be negative")
	}
	if total < 0 {
		return QuotaWindow{}, fmt.Errorf("quota total must not be negative")
	}
	return QuotaWindow{
		OrganizationID:  organizationID,
		Remaining:       remaining,
		ResetsInSeconds: resetsInSeconds,
		Total:           total,
	}, nil
}

func (window QuotaWindow) Headers() map[string]string {
	return map[string]string{
		"X-Toggl-Quota-Remaining": strconv.Itoa(window.Remaining),
		"X-Toggl-Quota-Resets-In": strconv.Itoa(window.ResetsInSeconds),
		"X-Toggl-Quota-Total":     strconv.Itoa(window.Total),
	}
}

func (window QuotaWindow) Exhausted() bool {
	return window.Remaining <= 0
}
