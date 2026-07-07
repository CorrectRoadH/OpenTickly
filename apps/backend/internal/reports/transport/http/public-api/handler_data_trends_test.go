package publicapi

import (
	"net/http"
	"time"

	"testing"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func mustLoadLocation(t *testing.T, name string) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation(name)
	if err != nil {
		t.Fatalf("failed to load location %q: %v", name, err)
	}
	return loc
}

func httpErrorCode(t *testing.T, err error) int {
	t.Helper()
	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected *echo.HTTPError, got %T: %v", err, err)
	}
	return httpErr.Code
}

func TestResolveDateBounds(t *testing.T) {
	utc := time.UTC

	tests := []struct {
		name      string
		start     *string
		end       *string
		loc       *time.Location
		wantStart time.Time
		wantEnd   time.Time
		wantCode  int    // 0 means no error expected
		wantMsg   string // only checked when wantCode != 0
	}{
		{
			name:      "both dates set",
			start:     lo.ToPtr("2026-05-01"),
			end:       lo.ToPtr("2026-05-07"),
			loc:       utc,
			wantStart: time.Date(2026, 5, 1, 0, 0, 0, 0, utc),
			wantEnd:   time.Date(2026, 5, 7, 0, 0, 0, 0, utc),
		},
		{
			name:      "both dates equal produces single-day window",
			start:     lo.ToPtr("2026-05-01"),
			end:       lo.ToPtr("2026-05-01"),
			loc:       utc,
			wantStart: time.Date(2026, 5, 1, 0, 0, 0, 0, utc),
			wantEnd:   time.Date(2026, 5, 1, 0, 0, 0, 0, utc),
		},
		{
			name:      "only start mirrors end to start",
			start:     lo.ToPtr("2026-05-03"),
			end:       nil,
			loc:       utc,
			wantStart: time.Date(2026, 5, 3, 0, 0, 0, 0, utc),
			wantEnd:   time.Date(2026, 5, 3, 0, 0, 0, 0, utc),
		},
		{
			name:      "only end mirrors start to end",
			start:     nil,
			end:       lo.ToPtr("2026-05-09"),
			loc:       utc,
			wantStart: time.Date(2026, 5, 9, 0, 0, 0, 0, utc),
			wantEnd:   time.Date(2026, 5, 9, 0, 0, 0, 0, utc),
		},
		{
			name:     "neither date set is rejected with official message",
			start:    nil,
			end:      nil,
			loc:      utc,
			wantCode: http.StatusBadRequest,
			wantMsg:  "At least one parameter must be set",
		},
		{
			name:     "end before start is rejected",
			start:    lo.ToPtr("2026-05-07"),
			end:      lo.ToPtr("2026-05-01"),
			loc:      utc,
			wantCode: http.StatusBadRequest,
			wantMsg:  "end date must not be before start date",
		},
		{
			name:     "invalid start format is rejected",
			start:    lo.ToPtr("05/01/2026"),
			end:      lo.ToPtr("2026-05-07"),
			loc:      utc,
			wantCode: http.StatusBadRequest,
			wantMsg:  "Wrong format date",
		},
		{
			name:     "invalid end format is rejected",
			start:    lo.ToPtr("2026-05-01"),
			end:      lo.ToPtr("not-a-date"),
			loc:      utc,
			wantCode: http.StatusBadRequest,
			wantMsg:  "Wrong format date",
		},
		{
			name:     "datetime instead of date is rejected",
			start:    lo.ToPtr("2026-05-01T00:00:00Z"),
			end:      nil,
			loc:      utc,
			wantCode: http.StatusBadRequest,
			wantMsg:  "Wrong format date",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			start, end, err := resolveDateBounds(tc.start, tc.end, tc.loc)
			if tc.wantCode != 0 {
				if err == nil {
					t.Fatalf("resolveDateBounds(%v, %v) expected error, got start=%v end=%v",
						lo.FromPtrOr(tc.start, "<nil>"), lo.FromPtrOr(tc.end, "<nil>"), start, end)
				}
				if code := httpErrorCode(t, err); code != tc.wantCode {
					t.Errorf("resolveDateBounds error code = %d, want %d (err: %v)", code, tc.wantCode, err)
				}
				if msg := err.(*echo.HTTPError).Message; msg != tc.wantMsg {
					t.Errorf("resolveDateBounds error message = %q, want %q", msg, tc.wantMsg)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveDateBounds(%v, %v) unexpected error: %v",
					lo.FromPtrOr(tc.start, "<nil>"), lo.FromPtrOr(tc.end, "<nil>"), err)
			}
			if !start.Equal(tc.wantStart) {
				t.Errorf("resolveDateBounds start = %v, want %v", start, tc.wantStart)
			}
			if !end.Equal(tc.wantEnd) {
				t.Errorf("resolveDateBounds end = %v, want %v", end, tc.wantEnd)
			}
		})
	}
}

func TestResolveDateBoundsParsesInProvidedLocation(t *testing.T) {
	tokyo := mustLoadLocation(t, "Asia/Tokyo")
	start, end, err := resolveDateBounds(lo.ToPtr("2026-05-01"), lo.ToPtr("2026-05-02"), tokyo)
	if err != nil {
		t.Fatalf("resolveDateBounds unexpected error: %v", err)
	}
	wantStart := time.Date(2026, 5, 1, 0, 0, 0, 0, tokyo)
	wantEnd := time.Date(2026, 5, 2, 0, 0, 0, 0, tokyo)
	if !start.Equal(wantStart) {
		t.Errorf("start = %v, want midnight in Asia/Tokyo (%v)", start, wantStart)
	}
	if !end.Equal(wantEnd) {
		t.Errorf("end = %v, want midnight in Asia/Tokyo (%v)", end, wantEnd)
	}
}

func TestBucketDate(t *testing.T) {
	utc := time.UTC
	tokyo := mustLoadLocation(t, "Asia/Tokyo")

	tests := []struct {
		name       string
		t          time.Time
		loc        *time.Location
		resolution string
		want       string
	}{
		{
			name:       "day resolution returns the local calendar date",
			t:          time.Date(2026, 5, 20, 12, 0, 0, 0, utc),
			loc:        utc,
			resolution: "day",
			want:       "2026-05-20",
		},
		{
			name:       "unknown resolution falls back to day",
			t:          time.Date(2026, 5, 20, 12, 0, 0, 0, utc),
			loc:        utc,
			resolution: "fortnight",
			want:       "2026-05-20",
		},
		{
			name:       "day resolution converts to target timezone before bucketing",
			t:          time.Date(2026, 5, 20, 23, 30, 0, 0, utc), // 2026-05-21 08:30 in Tokyo
			loc:        tokyo,
			resolution: "day",
			want:       "2026-05-21",
		},
		{
			name:       "month resolution returns first of month",
			t:          time.Date(2026, 5, 20, 12, 0, 0, 0, utc),
			loc:        utc,
			resolution: "month",
			want:       "2026-05-01",
		},
		{
			name:       "week resolution in a Monday-aligned ISO year",
			t:          time.Date(2024, 1, 4, 12, 0, 0, 0, utc), // ISO week 1 of 2024; Jan 1 2024 is a Monday
			loc:        utc,
			resolution: "week",
			want:       "2024-01-01",
		},
		{
			name:       "week resolution second ISO week",
			t:          time.Date(2024, 1, 10, 12, 0, 0, 0, utc), // ISO week 2 of 2024
			loc:        utc,
			resolution: "week",
			want:       "2024-01-08",
		},
		{
			// Current behavior: the bucket is anchored at Jan 1 of the ISO
			// year plus (week-1)*7 days, so in years where Jan 1 is not a
			// Monday the bucket date is not the ISO week's Monday.
			name:       "week resolution in a non-Monday-aligned ISO year anchors at Jan 1",
			t:          time.Date(2026, 1, 2, 12, 0, 0, 0, utc), // ISO week 1 of 2026; week's Monday is 2025-12-29
			loc:        utc,
			resolution: "week",
			want:       "2026-01-01",
		},
		{
			// Current behavior: a date belonging to ISO week 53 of the
			// previous ISO year buckets into that previous year.
			name:       "week resolution for date in previous ISO year week 53",
			t:          time.Date(2027, 1, 1, 12, 0, 0, 0, utc), // Friday, ISO week 53 of 2026
			loc:        utc,
			resolution: "week",
			want:       "2026-12-31",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := bucketDate(tc.t, tc.loc, tc.resolution)
			if got != tc.want {
				t.Errorf("bucketDate(%v, %s, %q) = %q, want %q",
					tc.t, tc.loc, tc.resolution, got, tc.want)
			}
		})
	}
}

func TestIntSetFromRequest(t *testing.T) {
	tests := []struct {
		name string
		ids  *[]int
		want map[int64]bool
	}{
		{
			name: "nil pointer yields nil set",
			ids:  nil,
			want: nil,
		},
		{
			name: "empty slice yields nil set",
			ids:  &[]int{},
			want: nil,
		},
		{
			name: "values are converted to an int64 membership set",
			ids:  &[]int{3, 7},
			want: map[int64]bool{3: true, 7: true},
		},
		{
			name: "duplicates collapse into one entry",
			ids:  &[]int{5, 5},
			want: map[int64]bool{5: true},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := intSetFromRequest(tc.ids)
			if tc.want == nil {
				if got != nil {
					t.Fatalf("intSetFromRequest(%v) = %v, want nil", tc.ids, got)
				}
				return
			}
			if len(got) != len(tc.want) {
				t.Fatalf("intSetFromRequest(%v) has %d entries, want %d (%v)", *tc.ids, len(got), len(tc.want), got)
			}
			for id := range tc.want {
				if !got[id] {
					t.Errorf("intSetFromRequest(%v) missing id %d", *tc.ids, id)
				}
			}
		})
	}
}

func TestSortedKeys(t *testing.T) {
	tests := []struct {
		name string
		in   map[string]struct{}
		want []string
	}{
		{
			name: "empty map yields empty slice",
			in:   map[string]struct{}{},
			want: []string{},
		},
		{
			name: "keys are returned in ascending order",
			in: map[string]struct{}{
				"2026-05-03": {},
				"2026-05-01": {},
				"2026-05-02": {},
			},
			want: []string{"2026-05-01", "2026-05-02", "2026-05-03"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := sortedKeys(tc.in)
			if len(got) != len(tc.want) {
				t.Fatalf("sortedKeys(%v) = %v, want %v", tc.in, got, tc.want)
			}
			for i := range tc.want {
				if got[i] != tc.want[i] {
					t.Errorf("sortedKeys(%v)[%d] = %q, want %q", tc.in, i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestLoadLocation(t *testing.T) {
	tests := []struct {
		name     string
		timezone string
		want     string
	}{
		{name: "empty timezone falls back to UTC", timezone: "", want: "UTC"},
		{name: "invalid timezone falls back to UTC", timezone: "Not/AZone", want: "UTC"},
		{name: "valid timezone is loaded", timezone: "Asia/Tokyo", want: "Asia/Tokyo"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := loadLocation(tc.timezone); got.String() != tc.want {
				t.Errorf("loadLocation(%q) = %q, want %q", tc.timezone, got.String(), tc.want)
			}
		})
	}
}
