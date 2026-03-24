package application

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"path"
	"strconv"
	"strings"
)

type ImportedArchive struct {
	Clients        ImportedClients
	ProjectUsers   ImportedProjectUsers
	Projects       ImportedProjects
	Tags           ImportedTags
	WorkspaceUsers ImportedWorkspaceUsers
}

type ImportedClient struct {
	Archived  bool   `json:"archived"`
	CreatorID int64  `json:"creator_id"`
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	WID       int64  `json:"wid"`
}

type ImportedClients struct {
	Items []ImportedClient
}

type ImportedProject struct {
	Active        bool   `json:"active"`
	ActualSeconds int64  `json:"actual_seconds"`
	ClientID      *int64 `json:"client_id"`
	CID           *int64 `json:"cid"`
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	Pinned        bool   `json:"pinned"`
	Status        string `json:"status"`
	WorkspaceID   int64  `json:"workspace_id"`
	WID           int64  `json:"wid"`
}

type ImportedProjects struct {
	Items []ImportedProject
}

type ImportedTag struct {
	CreatorID   int64  `json:"creator_id"`
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	WorkspaceID int64  `json:"workspace_id"`
}

type ImportedTags struct {
	Items []ImportedTag
}

type ImportedWorkspaceUser struct {
	Active   bool   `json:"active"`
	Admin    bool   `json:"admin"`
	Email    string `json:"email"`
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Timezone string `json:"timezone"`
	UID      int64  `json:"uid"`
	WID      int64  `json:"wid"`
}

type ImportedWorkspaceUsers struct {
	Items []ImportedWorkspaceUser
}

type ImportedProjectUser struct {
	ID          int64    `json:"id"`
	Manager     bool     `json:"manager"`
	ProjectID   int64    `json:"project_id"`
	Rate        *float64 `json:"rate"`
	UserID      int64    `json:"user_id"`
	WorkspaceID int64    `json:"workspace_id"`
}

type ImportedProjectUsers struct {
	Items []ImportedProjectUser
}

type importedArchiveEntry struct {
	Content []byte
	Name    string
}

type importedArchiveEntries struct {
	Items []importedArchiveEntry
}

func parseImportedArchive(archive []byte) (ImportedArchive, error) {
	reader, err := zip.NewReader(bytes.NewReader(archive), int64(len(archive)))
	if err != nil {
		return ImportedArchive{}, fmt.Errorf("%w: unreadable zip", ErrImportArchiveInvalid)
	}

	entries, err := readImportedArchiveEntries(reader)
	if err != nil {
		return ImportedArchive{}, err
	}

	clientsEntry, ok := entries.findByBaseName("clients.json")
	if !ok {
		return ImportedArchive{}, fmt.Errorf("%w: missing clients.json", ErrImportArchiveInvalid)
	}
	projectsEntry, ok := entries.findByBaseName("projects.json")
	if !ok {
		return ImportedArchive{}, fmt.Errorf("%w: missing projects.json", ErrImportArchiveInvalid)
	}
	tagsEntry, ok := entries.findByBaseName("tags.json")
	if !ok {
		return ImportedArchive{}, fmt.Errorf("%w: missing tags.json", ErrImportArchiveInvalid)
	}

	var imported ImportedArchive
	if err := decodeImportedClients(clientsEntry.Content, &imported.Clients); err != nil {
		return ImportedArchive{}, err
	}
	if err := decodeImportedProjects(projectsEntry.Content, &imported.Projects); err != nil {
		return ImportedArchive{}, err
	}
	if err := decodeImportedTags(tagsEntry.Content, &imported.Tags); err != nil {
		return ImportedArchive{}, err
	}

	if workspaceUsersEntry, found := entries.findByBaseName("workspace_users.json"); found {
		if err := decodeImportedWorkspaceUsers(workspaceUsersEntry.Content, &imported.WorkspaceUsers); err != nil {
			return ImportedArchive{}, err
		}
	}

	projectUserEntries := entries.projectUserEntries()
	if len(projectUserEntries) > 0 {
		items, err := decodeImportedProjectUsers(projectUserEntries)
		if err != nil {
			return ImportedArchive{}, err
		}
		imported.ProjectUsers = ImportedProjectUsers{Items: items}
	}

	return imported, nil
}

func readImportedArchiveEntries(reader *zip.Reader) (importedArchiveEntries, error) {
	entries := importedArchiveEntries{
		Items: make([]importedArchiveEntry, 0, len(reader.File)),
	}
	for _, file := range reader.File {
		if file.FileInfo().IsDir() {
			continue
		}
		fileReader, err := file.Open()
		if err != nil {
			return importedArchiveEntries{}, fmt.Errorf("%w: open %s", ErrImportArchiveInvalid, file.Name)
		}
		content := new(bytes.Buffer)
		if _, err := content.ReadFrom(fileReader); err != nil {
			fileReader.Close()
			return importedArchiveEntries{}, fmt.Errorf("%w: read %s", ErrImportArchiveInvalid, file.Name)
		}
		if err := fileReader.Close(); err != nil {
			return importedArchiveEntries{}, fmt.Errorf("%w: close %s", ErrImportArchiveInvalid, file.Name)
		}
		entries.Items = append(entries.Items, importedArchiveEntry{
			Content: content.Bytes(),
			Name:    file.Name,
		})
	}
	return entries, nil
}

func (entries importedArchiveEntries) findByBaseName(baseName string) (importedArchiveEntry, bool) {
	for _, entry := range entries.Items {
		if path.Base(strings.TrimSpace(entry.Name)) == baseName {
			return entry, true
		}
	}
	return importedArchiveEntry{}, false
}

func (entries importedArchiveEntries) projectUserEntries() []importedArchiveEntry {
	items := make([]importedArchiveEntry, 0)
	for _, entry := range entries.Items {
		normalized := strings.TrimSpace(entry.Name)
		if strings.Contains(normalized, "/projects_users/") || strings.HasPrefix(normalized, "projects_users/") {
			items = append(items, entry)
		}
	}
	return items
}

func decodeImportedClients(content []byte, target *ImportedClients) error {
	if err := json.Unmarshal(content, &target.Items); err != nil {
		return fmt.Errorf("%w: invalid clients.json", ErrImportArchiveInvalid)
	}
	return nil
}

func decodeImportedProjects(content []byte, target *ImportedProjects) error {
	if err := json.Unmarshal(content, &target.Items); err != nil {
		return fmt.Errorf("%w: invalid projects.json", ErrImportArchiveInvalid)
	}
	return nil
}

func decodeImportedTags(content []byte, target *ImportedTags) error {
	if err := json.Unmarshal(content, &target.Items); err != nil {
		return fmt.Errorf("%w: invalid tags.json", ErrImportArchiveInvalid)
	}
	return nil
}

func decodeImportedWorkspaceUsers(content []byte, target *ImportedWorkspaceUsers) error {
	if err := json.Unmarshal(content, &target.Items); err != nil {
		return fmt.Errorf("%w: invalid workspace_users.json", ErrImportArchiveInvalid)
	}
	return nil
}

func decodeImportedProjectUsers(entries []importedArchiveEntry) ([]ImportedProjectUser, error) {
	items := make([]ImportedProjectUser, 0)
	for _, entry := range entries {
		var projectUsers []ImportedProjectUser
		if err := json.Unmarshal(entry.Content, &projectUsers); err != nil {
			return nil, fmt.Errorf("%w: invalid %s", ErrImportArchiveInvalid, entry.Name)
		}
		projectIDFromFile, ok := importedProjectIDFromPath(entry.Name)
		if !ok {
			return nil, fmt.Errorf("%w: invalid project user filename %s", ErrImportArchiveInvalid, entry.Name)
		}
		for index := range projectUsers {
			if projectUsers[index].ProjectID == 0 {
				projectUsers[index].ProjectID = projectIDFromFile
			}
			items = append(items, projectUsers[index])
		}
	}
	return items, nil
}

func importedProjectIDFromPath(name string) (int64, bool) {
	baseName := path.Base(strings.TrimSpace(name))
	projectIDString := strings.TrimSuffix(baseName, path.Ext(baseName))
	projectID, err := strconv.ParseInt(projectIDString, 10, 64)
	if err != nil || projectID <= 0 {
		return 0, false
	}
	return projectID, true
}
