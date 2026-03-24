package application

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

func (service *Service) StartWorkspaceTimeEntriesImport(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
	source string,
	content []byte,
) (ImportJobView, error) {
	if workspaceID <= 0 || requestedBy <= 0 {
		return ImportJobView{}, ErrInvalidScopeID
	}
	if strings.TrimSpace(source) != ImportSourceTimeEntriesCSV {
		return ImportJobView{}, ErrImportSourceInvalid
	}
	if len(content) == 0 {
		return ImportJobView{}, ErrImportArchiveRequired
	}

	entries, err := parseImportedTimeEntriesCSV(content)
	if err != nil {
		return ImportJobView{}, err
	}

	jobID, err := newExportToken()
	if err != nil {
		return ImportJobView{}, err
	}
	_, err = service.store.SaveImportJob(ctx, SaveImportJobCommand{
		ArchiveContent: content,
		JobID:          jobID,
		RequestedBy:    requestedBy,
		Source:         source,
		Status:         ImportStatusQueued,
		WorkspaceID:    workspaceID,
	})
	if err != nil {
		return ImportJobView{}, err
	}
	if err := service.store.ImportTimeEntries(ctx, ImportTimeEntriesCommand{
		Entries:     entries,
		JobID:       jobID,
		RequestedBy: requestedBy,
		WorkspaceID: workspaceID,
	}); err != nil {
		failedJob, updateErr := service.store.UpdateImportJob(ctx, UpdateImportJobCommand{
			ErrorMessage: err.Error(),
			JobID:        jobID,
			Status:       ImportStatusFailed,
		})
		if updateErr != nil {
			return ImportJobView{}, updateErr
		}
		return failedJob, nil
	}
	return service.store.UpdateImportJob(ctx, UpdateImportJobCommand{
		JobID:  jobID,
		Status: ImportStatusCompleted,
	})
}

func parseImportedTimeEntriesCSV(content []byte) (ImportedTimeEntries, error) {
	reader := csv.NewReader(bytes.NewReader(content))
	reader.FieldsPerRecord = -1

	rows, err := reader.ReadAll()
	if err != nil {
		return ImportedTimeEntries{}, fmt.Errorf("%w: invalid time entry csv", ErrImportArchiveInvalid)
	}
	if len(rows) < 2 {
		return ImportedTimeEntries{}, fmt.Errorf("%w: empty time entry csv", ErrImportArchiveInvalid)
	}

	header, err := newImportedTimeEntryCSVHeader(rows[0])
	if err != nil {
		return ImportedTimeEntries{}, err
	}
	entries := ImportedTimeEntries{
		Items: make([]ImportedTimeEntry, 0, len(rows)-1),
	}
	for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
		entry, err := parseImportedTimeEntryRow(rows[rowIndex], header)
		if err != nil {
			return ImportedTimeEntries{}, fmt.Errorf("%w: row %d", err, rowIndex+1)
		}
		entries.Items = append(entries.Items, entry)
	}
	return entries, nil
}

type importedTimeEntryCSVHeader struct {
	Billable    int
	Client      int
	Description int
	Duration    int
	Email       int
	EndDate     int
	EndTime     int
	Project     int
	StartDate   int
	StartTime   int
	Tags        int
	Task        int
	User        int
}

func newImportedTimeEntryCSVHeader(row []string) (importedTimeEntryCSVHeader, error) {
	header := importedTimeEntryCSVHeader{
		User:        -1,
		Email:       -1,
		Client:      -1,
		Project:     -1,
		Task:        -1,
		Description: -1,
		Billable:    -1,
		StartDate:   -1,
		StartTime:   -1,
		EndDate:     -1,
		EndTime:     -1,
		Duration:    -1,
		Tags:        -1,
	}
	for index, value := range row {
		switch strings.TrimSpace(value) {
		case "User":
			header.User = index
		case "Email":
			header.Email = index
		case "Client":
			header.Client = index
		case "Project":
			header.Project = index
		case "Task":
			header.Task = index
		case "Description":
			header.Description = index
		case "Billable":
			header.Billable = index
		case "Start date":
			header.StartDate = index
		case "Start time":
			header.StartTime = index
		case "End date":
			header.EndDate = index
		case "End time":
			header.EndTime = index
		case "Duration":
			header.Duration = index
		case "Tags":
			header.Tags = index
		}
	}
	if header.User < 0 || header.Email < 0 || header.Description < 0 || header.StartDate < 0 || header.StartTime < 0 || header.Duration < 0 {
		return importedTimeEntryCSVHeader{}, fmt.Errorf("%w: missing required time entry csv headers", ErrImportArchiveInvalid)
	}
	return header, nil
}

func parseImportedTimeEntryRow(row []string, header importedTimeEntryCSVHeader) (ImportedTimeEntry, error) {
	duration, err := parseImportedDuration(csvValue(row, header.Duration))
	if err != nil {
		return ImportedTimeEntry{}, fmt.Errorf("%w: invalid duration", ErrImportArchiveInvalid)
	}
	start, err := parseImportedDateTime(csvValue(row, header.StartDate), csvValue(row, header.StartTime), true)
	if err != nil {
		return ImportedTimeEntry{}, err
	}
	end, err := parseImportedDateTime(csvValue(row, header.EndDate), csvValue(row, header.EndTime), false)
	if err != nil {
		return ImportedTimeEntry{}, err
	}

	return ImportedTimeEntry{
		Billable:    parseImportedBillable(csvValue(row, header.Billable)),
		ClientName:  csvValue(row, header.Client),
		Description: csvValue(row, header.Description),
		Duration:    duration,
		Email:       csvValue(row, header.Email),
		End:         end,
		ProjectName: csvValue(row, header.Project),
		Start:       *start,
		TagNames:    parseImportedTags(csvValue(row, header.Tags)),
		TaskName:    csvValue(row, header.Task),
		UserName:    csvValue(row, header.User),
	}, nil
}

func csvValue(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func parseImportedBillable(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), "yes") || strings.EqualFold(strings.TrimSpace(value), "true")
}

func parseImportedDateTime(dateValue string, timeValue string, required bool) (*ImportedTime, error) {
	dateValue = strings.TrimSpace(dateValue)
	timeValue = strings.TrimSpace(timeValue)
	switch {
	case dateValue == "" && timeValue == "":
		if required {
			return nil, fmt.Errorf("%w: missing start date/time", ErrImportArchiveInvalid)
		}
		return nil, nil
	case dateValue == "" || timeValue == "":
		return nil, fmt.Errorf("%w: invalid date/time pair", ErrImportArchiveInvalid)
	default:
		return &ImportedTime{
			Value: dateValue + " " + timeValue,
		}, nil
	}
}

func parseImportedDuration(value string) (int, error) {
	parts := strings.Split(strings.TrimSpace(value), ":")
	if len(parts) != 3 {
		return 0, errors.New("invalid duration")
	}
	hours, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, err
	}
	minutes, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, err
	}
	seconds, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0, err
	}
	if hours < 0 || minutes < 0 || seconds < 0 {
		return 0, errors.New("negative duration")
	}
	return hours*3600 + minutes*60 + seconds, nil
}

func parseImportedTags(value string) []string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return nil
	}
	parts := strings.Split(normalized, ",")
	tags := make([]string, 0, len(parts))
	for _, part := range parts {
		tag := strings.TrimSpace(part)
		if tag == "" {
			continue
		}
		tags = append(tags, tag)
	}
	return tags
}
