package domain

import (
	"fmt"
	"strings"
)

type Organization struct {
	id           OrganizationID
	name         string
	workspaceIDs []WorkspaceID
}

func NormalizeOrganizationName(name string) (string, error) {
	return normalizeTenantName(name, "organization")
}

func NewOrganization(id OrganizationID, name string) (Organization, error) {
	normalizedName, err := NormalizeOrganizationName(name)
	if err != nil {
		return Organization{}, err
	}

	return Organization{
		id:   id,
		name: normalizedName,
	}, nil
}

func (organization Organization) ID() OrganizationID {
	return organization.id
}

func (organization Organization) Name() string {
	return organization.name
}

func (organization Organization) WorkspaceIDs() []WorkspaceID {
	return append([]WorkspaceID(nil), organization.workspaceIDs...)
}

func (organization *Organization) Rename(name string) error {
	normalizedName, err := NormalizeOrganizationName(name)
	if err != nil {
		return err
	}

	organization.name = normalizedName
	return nil
}

func (organization *Organization) AddWorkspace(workspaceID WorkspaceID) {
	for _, existing := range organization.workspaceIDs {
		if existing == workspaceID {
			return
		}
	}

	organization.workspaceIDs = append(organization.workspaceIDs, workspaceID)
}

func (organization *Organization) RemoveWorkspace(workspaceID WorkspaceID) {
	filtered := organization.workspaceIDs[:0]
	for _, existing := range organization.workspaceIDs {
		if existing == workspaceID {
			continue
		}

		filtered = append(filtered, existing)
	}

	organization.workspaceIDs = filtered
}

func normalizeTenantName(value string, resource string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", fmt.Errorf("%s name must contain non-space characters", resource)
	}
	if len(normalized) > 140 {
		return "", fmt.Errorf("%s name must not be longer than 140", resource)
	}
	return normalized, nil
}
