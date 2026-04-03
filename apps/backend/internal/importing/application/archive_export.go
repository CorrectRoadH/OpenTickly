package application

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"time"
)

// WorkspaceExportData holds the workspace data to be written into an export archive.
// Core types (Clients, Projects, Tags, WorkspaceUsers, ProjectUsers) reuse Imported*
// structs so the format matches Toggl import exactly for round-trip fidelity.
// Additional types use json.RawMessage for flexibility.
type WorkspaceExportData struct {
	Clients            []ImportedClient
	Projects           []ImportedProject
	Tags               []ImportedTag
	WorkspaceUsers     []ImportedWorkspaceUser
	ProjectUsers       []ImportedProjectUser
	Tasks              json.RawMessage
	Teams              json.RawMessage
	WorkspaceSettings  json.RawMessage
	Alerts             json.RawMessage
	CustomReports      json.RawMessage
	ScheduledReports   json.RawMessage
	TrackingReminders  json.RawMessage
	Invoices           json.RawMessage
}

// BuildWorkspaceArchive writes a ZIP archive containing manifest.json and the
// requested data files. The JSON format is identical to the Toggl export format
// consumed by parseImportedArchive, enabling round-trip import/export.
func BuildWorkspaceArchive(
	workspaceID int64,
	requestedBy int64,
	objects []string,
	data WorkspaceExportData,
	createdAt time.Time,
) ([]byte, error) {
	objectSet := make(map[string]bool, len(objects))
	for _, o := range objects {
		objectSet[o] = true
	}

	manifest, err := json.Marshal(struct {
		Scope       ExportScope `json:"scope"`
		ScopeID     int64       `json:"scope_id"`
		RequestedBy int64       `json:"requested_by"`
		CreatedAt   string      `json:"created_at"`
		Objects     []string    `json:"objects"`
	}{
		Scope:       ExportScopeWorkspace,
		ScopeID:     workspaceID,
		RequestedBy: requestedBy,
		CreatedAt:   createdAt.Format(time.RFC3339),
		Objects:     objects,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal manifest: %w", err)
	}

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)

	if err := writeZipJSON(writer, "manifest.json", manifest); err != nil {
		return nil, err
	}

	if objectSet["clients"] && data.Clients != nil {
		encoded, err := json.Marshal(data.Clients)
		if err != nil {
			return nil, fmt.Errorf("marshal clients: %w", err)
		}
		if err := writeZipJSON(writer, "clients.json", encoded); err != nil {
			return nil, err
		}
	}

	if objectSet["projects"] && data.Projects != nil {
		encoded, err := json.Marshal(data.Projects)
		if err != nil {
			return nil, fmt.Errorf("marshal projects: %w", err)
		}
		if err := writeZipJSON(writer, "projects.json", encoded); err != nil {
			return nil, err
		}
	}

	if objectSet["tags"] && data.Tags != nil {
		encoded, err := json.Marshal(data.Tags)
		if err != nil {
			return nil, fmt.Errorf("marshal tags: %w", err)
		}
		if err := writeZipJSON(writer, "tags.json", encoded); err != nil {
			return nil, err
		}
	}

	if (objectSet["workspace_users"] || objectSet["team"]) && data.WorkspaceUsers != nil {
		encoded, err := json.Marshal(data.WorkspaceUsers)
		if err != nil {
			return nil, fmt.Errorf("marshal workspace_users: %w", err)
		}
		if err := writeZipJSON(writer, "workspace_users.json", encoded); err != nil {
			return nil, err
		}
	}

	if objectSet["projects_users"] && data.ProjectUsers != nil {
		grouped := groupProjectUsersByProject(data.ProjectUsers)
		for projectID, users := range grouped {
			encoded, err := json.Marshal(users)
			if err != nil {
				return nil, fmt.Errorf("marshal projects_users/%d: %w", projectID, err)
			}
			filename := fmt.Sprintf("projects_users/%d.json", projectID)
			if err := writeZipJSON(writer, filename, encoded); err != nil {
				return nil, err
			}
		}
	}

	rawEntries := []struct {
		key      string
		filename string
		data     json.RawMessage
	}{
		{"project_tasks", "project_tasks.json", data.Tasks},
		{"teams", "teams.json", data.Teams},
		{"workspace_settings", "workspace_settings.json", data.WorkspaceSettings},
		{"alerts", "alerts.json", data.Alerts},
		{"custom_reports", "custom_reports.json", data.CustomReports},
		{"scheduled_reports", "scheduled_reports.json", data.ScheduledReports},
		{"tracking_reminders", "tracking_reminders.json", data.TrackingReminders},
		{"invoices", "invoices.json", data.Invoices},
	}
	for _, entry := range rawEntries {
		if objectSet[entry.key] && entry.data != nil {
			if err := writeZipJSON(writer, entry.filename, entry.data); err != nil {
				return nil, err
			}
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("close zip: %w", err)
	}
	return buffer.Bytes(), nil
}

func writeZipJSON(writer *zip.Writer, name string, data []byte) error {
	entry, err := writer.Create(name)
	if err != nil {
		return fmt.Errorf("create zip entry %s: %w", name, err)
	}
	if _, err := entry.Write(data); err != nil {
		return fmt.Errorf("write zip entry %s: %w", name, err)
	}
	return nil
}

func groupProjectUsersByProject(users []ImportedProjectUser) map[int64][]ImportedProjectUser {
	grouped := make(map[int64][]ImportedProjectUser)
	for _, u := range users {
		grouped[u.ProjectID] = append(grouped[u.ProjectID], u)
	}
	return grouped
}
