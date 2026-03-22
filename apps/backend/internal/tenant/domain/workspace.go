package domain

type Workspace struct {
	id             WorkspaceID
	organizationID OrganizationID
	name           string
	settings       WorkspaceSettings
	branding       WorkspaceBranding
}

func NormalizeWorkspaceName(name string) (string, error) {
	return normalizeTenantName(name, "workspace")
}

func NewWorkspace(
	id WorkspaceID,
	organizationID OrganizationID,
	name string,
	settings WorkspaceSettings,
) (Workspace, error) {
	normalizedName, err := NormalizeWorkspaceName(name)
	if err != nil {
		return Workspace{}, err
	}

	return Workspace{
		id:             id,
		organizationID: organizationID,
		name:           normalizedName,
		settings:       settings,
	}, nil
}

func (workspace Workspace) ID() WorkspaceID {
	return workspace.id
}

func (workspace Workspace) OrganizationID() OrganizationID {
	return workspace.organizationID
}

func (workspace Workspace) Name() string {
	return workspace.name
}

func (workspace Workspace) Settings() WorkspaceSettings {
	return workspace.settings
}

func (workspace Workspace) Branding() WorkspaceBranding {
	return workspace.branding
}

func (workspace *Workspace) Rename(name string) error {
	normalizedName, err := NormalizeWorkspaceName(name)
	if err != nil {
		return err
	}

	workspace.name = normalizedName
	return nil
}

func (workspace *Workspace) UpdateSettings(settings WorkspaceSettings) {
	workspace.settings = settings
}

func (workspace *Workspace) UpdateBranding(branding WorkspaceBranding) {
	workspace.branding = branding
}
