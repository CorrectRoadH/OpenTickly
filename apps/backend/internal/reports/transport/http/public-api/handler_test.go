package publicapi

import (
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func TestPartitionNullableIDs(t *testing.T) {
	tests := []struct {
		name     string
		values   *[]*int
		wantIDs  []int64
		wantNull bool
	}{
		{
			name:     "nil pointer means field absent",
			values:   nil,
			wantIDs:  nil,
			wantNull: false,
		},
		{
			name:     "empty list yields no ids and no null flag",
			values:   &[]*int{},
			wantIDs:  []int64{},
			wantNull: false,
		},
		{
			name:     "single null entry sets flag only",
			values:   &[]*int{nil},
			wantIDs:  []int64{},
			wantNull: true,
		},
		{
			name:     "plain ids pass through without flag",
			values:   &[]*int{lo.ToPtr(1), lo.ToPtr(2)},
			wantIDs:  []int64{1, 2},
			wantNull: false,
		},
		{
			name:     "mixed null and ids sets flag and keeps ids",
			values:   &[]*int{nil, lo.ToPtr(3), nil, lo.ToPtr(9)},
			wantIDs:  []int64{3, 9},
			wantNull: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ids, hasNull := partitionNullableIDs(tc.values)
			if hasNull != tc.wantNull {
				t.Errorf("partitionNullableIDs(%v) hasNull = %v, want %v", tc.values, hasNull, tc.wantNull)
			}
			if tc.wantIDs == nil {
				if ids != nil {
					t.Fatalf("partitionNullableIDs(nil) ids = %v, want nil", ids)
				}
				return
			}
			if !slices.Equal(ids, tc.wantIDs) {
				t.Errorf("partitionNullableIDs ids = %v, want %v", ids, tc.wantIDs)
			}
		})
	}
}

func TestApplyNullableIDFilters(t *testing.T) {
	query := reportsapplication.Query{}
	filters := nullableIDFilters{
		ProjectIDs: []int64{1},
		NoProject:  true,
		TagIDs:     []int64{2, 3},
		NoTag:      true,
		TaskIDs:    []int64{4},
		NoTask:     true,
		// ClientIDs / NoClient intentionally have no Query counterpart; they
		// feed ProjectProfitabilityQuery instead.
		ClientIDs: []int64{9},
		NoClient:  true,
	}

	applyNullableIDFilters(&query, filters)

	if !slices.Equal(query.ProjectIDs, filters.ProjectIDs) || query.NoProject != filters.NoProject {
		t.Errorf("project filter not applied: got ids=%v noProject=%v, want ids=%v noProject=%v",
			query.ProjectIDs, query.NoProject, filters.ProjectIDs, filters.NoProject)
	}
	if !slices.Equal(query.TagIDs, filters.TagIDs) || query.NoTag != filters.NoTag {
		t.Errorf("tag filter not applied: got ids=%v noTag=%v, want ids=%v noTag=%v",
			query.TagIDs, query.NoTag, filters.TagIDs, filters.NoTag)
	}
	if !slices.Equal(query.TaskIDs, filters.TaskIDs) || query.NoTask != filters.NoTask {
		t.Errorf("task filter not applied: got ids=%v noTask=%v, want ids=%v noTask=%v",
			query.TaskIDs, query.NoTask, filters.TaskIDs, filters.NoTask)
	}
}

func newJSONContext(t *testing.T, body string) echo.Context {
	t.Helper()
	e := echo.New()
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	return e.NewContext(request, httptest.NewRecorder())
}

// bindTarget mirrors the shape oapi-codegen generates for the reports request
// DTOs, without depending on a specific generated type.
type bindTarget struct {
	StartDate  *string `json:"start_date"`
	ProjectIds *[]int  `json:"project_ids"`
	TagIds     *[]int  `json:"tag_ids"`
	TaskIds    *[]int  `json:"task_ids"`
	ClientIds  *[]int  `json:"client_ids"`
}

func TestBindWithNullableIDs(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		want    nullableIDFilters
		wantErr bool
	}{
		{
			name: "empty body yields zero filters",
			body: "",
			want: nullableIDFilters{},
		},
		{
			name: "body without filter fields yields zero filters",
			body: `{"start_date":"2026-05-01"}`,
			want: nullableIDFilters{},
		},
		{
			name: "project_ids [null] means records with no project",
			body: `{"project_ids":[null]}`,
			want: nullableIDFilters{ProjectIDs: []int64{}, NoProject: true},
		},
		{
			name: "project_ids [null, id] means no project OR the id",
			body: `{"project_ids":[null,5]}`,
			want: nullableIDFilters{ProjectIDs: []int64{5}, NoProject: true},
		},
		{
			name: "all four fields parsed independently",
			body: `{"project_ids":[1],"tag_ids":[null],"task_ids":[null,7],"client_ids":[null]}`,
			want: nullableIDFilters{
				ProjectIDs: []int64{1},
				TagIDs:     []int64{}, NoTag: true,
				TaskIDs: []int64{7}, NoTask: true,
				ClientIDs: []int64{}, NoClient: true,
			},
		},
		{
			name:    "malformed JSON is rejected",
			body:    `{"project_ids":[`,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := newJSONContext(t, tc.body)
			var typed bindTarget
			filters, err := bindWithNullableIDs(ctx, &typed)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("bindWithNullableIDs(%q) expected error, got filters %+v", tc.body, filters)
				}
				httpErr, ok := err.(*echo.HTTPError)
				if !ok || httpErr.Code != http.StatusBadRequest {
					t.Errorf("bindWithNullableIDs(%q) error = %v, want *echo.HTTPError with code 400", tc.body, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("bindWithNullableIDs(%q) unexpected error: %v", tc.body, err)
			}
			assertFilterField(t, "project", filters.ProjectIDs, filters.NoProject, tc.want.ProjectIDs, tc.want.NoProject)
			assertFilterField(t, "tag", filters.TagIDs, filters.NoTag, tc.want.TagIDs, tc.want.NoTag)
			assertFilterField(t, "task", filters.TaskIDs, filters.NoTask, tc.want.TaskIDs, tc.want.NoTask)
			assertFilterField(t, "client", filters.ClientIDs, filters.NoClient, tc.want.ClientIDs, tc.want.NoClient)
		})
	}
}

func assertFilterField(t *testing.T, field string, gotIDs []int64, gotNull bool, wantIDs []int64, wantNull bool) {
	t.Helper()
	if gotNull != wantNull {
		t.Errorf("%s no-X flag = %v, want %v", field, gotNull, wantNull)
	}
	if len(gotIDs) != len(wantIDs) || !slices.Equal(gotIDs, wantIDs) {
		t.Errorf("%s ids = %v, want %v", field, gotIDs, wantIDs)
	}
}

func TestBindWithNullableIDsDecodesTypedTarget(t *testing.T) {
	ctx := newJSONContext(t, `{"start_date":"2026-05-01","project_ids":[null,5]}`)
	var typed bindTarget
	if _, err := bindWithNullableIDs(ctx, &typed); err != nil {
		t.Fatalf("bindWithNullableIDs unexpected error: %v", err)
	}
	if typed.StartDate == nil || *typed.StartDate != "2026-05-01" {
		t.Errorf("typed.StartDate = %v, want 2026-05-01", typed.StartDate)
	}
}

func TestBindWithNullableIDsRestoresRequestBody(t *testing.T) {
	body := `{"project_ids":[null,5]}`
	ctx := newJSONContext(t, body)
	var typed bindTarget
	if _, err := bindWithNullableIDs(ctx, &typed); err != nil {
		t.Fatalf("bindWithNullableIDs unexpected error: %v", err)
	}
	remaining, err := io.ReadAll(ctx.Request().Body)
	if err != nil {
		t.Fatalf("re-reading request body failed: %v", err)
	}
	if string(remaining) != body {
		t.Errorf("request body after bind = %q, want original %q restored", remaining, body)
	}
}

func TestIntConversionHelpers(t *testing.T) {
	t.Run("intsToInt64s converts every element", func(t *testing.T) {
		got := intsToInt64s([]int{1, 2, 3})
		if !slices.Equal(got, []int64{1, 2, 3}) {
			t.Errorf("intsToInt64s([1 2 3]) = %v, want [1 2 3]", got)
		}
	})
	t.Run("int64sToInts converts every element", func(t *testing.T) {
		got := int64sToInts([]int64{4, 5})
		if !slices.Equal(got, []int{4, 5}) {
			t.Errorf("int64sToInts([4 5]) = %v, want [4 5]", got)
		}
	})
	t.Run("derefInt64Ptr", func(t *testing.T) {
		if got := derefInt64Ptr(nil); got != 0 {
			t.Errorf("derefInt64Ptr(nil) = %d, want 0", got)
		}
		if got := derefInt64Ptr(lo.ToPtr(int64(42))); got != 42 {
			t.Errorf("derefInt64Ptr(&42) = %d, want 42", got)
		}
	})
}
