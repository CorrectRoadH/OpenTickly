package application

import (
	"testing"

	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/samber/lo"
)

// entryWith builds a TimeEntryView with only the fields matchesQueryFilters
// inspects.
func entryWith(projectID *int64, tagIDs []int64, taskID *int64, description string) trackingapplication.TimeEntryView {
	return trackingapplication.TimeEntryView{
		ProjectID:   projectID,
		TagIDs:      tagIDs,
		TaskID:      taskID,
		Description: description,
	}
}

func TestMatchesQueryFilters(t *testing.T) {
	tests := []struct {
		name  string
		entry trackingapplication.TimeEntryView
		query Query
		want  bool
	}{
		{
			name:  "no filters matches everything",
			entry: entryWith(lo.ToPtr(int64(1)), []int64{2}, lo.ToPtr(int64(3)), "anything"),
			query: Query{},
			want:  true,
		},

		// Project filter.
		{
			name:  "project list matches entry in list",
			entry: entryWith(lo.ToPtr(int64(5)), nil, nil, ""),
			query: Query{ProjectIDs: []int64{5, 6}},
			want:  true,
		},
		{
			name:  "project list rejects entry not in list",
			entry: entryWith(lo.ToPtr(int64(7)), nil, nil, ""),
			query: Query{ProjectIDs: []int64{5, 6}},
			want:  false,
		},
		{
			name:  "project list rejects entry with no project",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{ProjectIDs: []int64{5}},
			want:  false,
		},
		{
			name:  "[null] project filter matches entry with no project",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoProject: true},
			want:  true,
		},
		{
			name:  "[null] project filter rejects entry with a project",
			entry: entryWith(lo.ToPtr(int64(5)), nil, nil, ""),
			query: Query{NoProject: true},
			want:  false,
		},
		{
			name:  "[null, id] project filter matches entry with no project (OR semantics)",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoProject: true, ProjectIDs: []int64{5}},
			want:  true,
		},
		{
			name:  "[null, id] project filter matches entry with listed project (OR semantics)",
			entry: entryWith(lo.ToPtr(int64(5)), nil, nil, ""),
			query: Query{NoProject: true, ProjectIDs: []int64{5}},
			want:  true,
		},
		{
			name:  "[null, id] project filter rejects entry with unlisted project",
			entry: entryWith(lo.ToPtr(int64(7)), nil, nil, ""),
			query: Query{NoProject: true, ProjectIDs: []int64{5}},
			want:  false,
		},

		// Tag filter.
		{
			name:  "tag list matches entry sharing any tag",
			entry: entryWith(nil, []int64{1, 2}, nil, ""),
			query: Query{TagIDs: []int64{2, 9}},
			want:  true,
		},
		{
			name:  "tag list rejects entry with no overlapping tags",
			entry: entryWith(nil, []int64{1}, nil, ""),
			query: Query{TagIDs: []int64{2}},
			want:  false,
		},
		{
			name:  "tag list rejects untagged entry",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{TagIDs: []int64{2}},
			want:  false,
		},
		{
			name:  "[null] tag filter matches untagged entry",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoTag: true},
			want:  true,
		},
		{
			name:  "[null] tag filter rejects tagged entry",
			entry: entryWith(nil, []int64{1}, nil, ""),
			query: Query{NoTag: true},
			want:  false,
		},
		{
			name:  "[null, id] tag filter matches untagged entry (OR semantics)",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoTag: true, TagIDs: []int64{2}},
			want:  true,
		},
		{
			name:  "[null, id] tag filter matches entry with listed tag (OR semantics)",
			entry: entryWith(nil, []int64{2, 3}, nil, ""),
			query: Query{NoTag: true, TagIDs: []int64{2}},
			want:  true,
		},
		{
			name:  "[null, id] tag filter rejects entry with only unlisted tags",
			entry: entryWith(nil, []int64{3}, nil, ""),
			query: Query{NoTag: true, TagIDs: []int64{2}},
			want:  false,
		},

		// Task filter.
		{
			name:  "task list matches entry in list",
			entry: entryWith(nil, nil, lo.ToPtr(int64(11)), ""),
			query: Query{TaskIDs: []int64{11}},
			want:  true,
		},
		{
			name:  "task list rejects entry not in list",
			entry: entryWith(nil, nil, lo.ToPtr(int64(12)), ""),
			query: Query{TaskIDs: []int64{11}},
			want:  false,
		},
		{
			name:  "task list rejects entry with no task",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{TaskIDs: []int64{11}},
			want:  false,
		},
		{
			name:  "[null] task filter matches entry with no task",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoTask: true},
			want:  true,
		},
		{
			name:  "[null] task filter rejects entry with a task",
			entry: entryWith(nil, nil, lo.ToPtr(int64(11)), ""),
			query: Query{NoTask: true},
			want:  false,
		},
		{
			name:  "[null, id] task filter matches entry with no task (OR semantics)",
			entry: entryWith(nil, nil, nil, ""),
			query: Query{NoTask: true, TaskIDs: []int64{11}},
			want:  true,
		},
		{
			name:  "[null, id] task filter rejects entry with unlisted task",
			entry: entryWith(nil, nil, lo.ToPtr(int64(12)), ""),
			query: Query{NoTask: true, TaskIDs: []int64{11}},
			want:  false,
		},

		// Description filter.
		{
			name:  "description substring matches case-insensitively",
			entry: entryWith(nil, nil, nil, "Weekly Standup Meeting"),
			query: Query{Description: "standup"},
			want:  true,
		},
		{
			name:  "description filter rejects non-matching entry",
			entry: entryWith(nil, nil, nil, "Deep work"),
			query: Query{Description: "standup"},
			want:  false,
		},

		// Combined filters are AND-ed across fields.
		{
			name:  "project match with failing description filter is rejected",
			entry: entryWith(lo.ToPtr(int64(5)), nil, nil, "Deep work"),
			query: Query{ProjectIDs: []int64{5}, Description: "standup"},
			want:  false,
		},
		{
			name:  "all filters passing together matches",
			entry: entryWith(lo.ToPtr(int64(5)), []int64{2}, nil, "Weekly Standup"),
			query: Query{ProjectIDs: []int64{5}, TagIDs: []int64{2}, NoTask: true, Description: "standup"},
			want:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := matchesQueryFilters(tc.entry, tc.query)
			if got != tc.want {
				t.Errorf(
					"matchesQueryFilters(entry{project=%v tags=%v task=%v desc=%q}, query{projects=%v noProject=%v tags=%v noTag=%v tasks=%v noTask=%v desc=%q}) = %v, want %v",
					tc.entry.ProjectID, tc.entry.TagIDs, tc.entry.TaskID, tc.entry.Description,
					tc.query.ProjectIDs, tc.query.NoProject, tc.query.TagIDs, tc.query.NoTag,
					tc.query.TaskIDs, tc.query.NoTask, tc.query.Description,
					got, tc.want,
				)
			}
		})
	}
}
