package application

import (
	"errors"
	"strconv"
	"strings"
	"testing"
)

func TestParseImportedDuration(t *testing.T) {
	for _, test := range []struct {
		input string
		want  int
	}{
		{"00:18:25", 1105},
		{"25:00:01", 90001},
		{"18:25 min", 1105},
		{"0:05 min", 5},
		{"90:00 min", 5400},
		{"45 sec", 45},
		{"0 sec", 0},
		{"1.5 h", 5400},
		{"2 h", 7200},
		{"0.0001 h", 0},
		{"0.00125 h", 5},
		{" 18:25 min ", 1105},
	} {
		t.Run(test.input, func(t *testing.T) {
			got, err := parseImportedDuration(test.input)
			if err != nil || got != test.want {
				t.Fatalf("parseImportedDuration(%q) = %d, %v; want %d", test.input, got, err, test.want)
			}
		})
	}
}

func TestParseImportedDurationRejectsInvalidValues(t *testing.T) {
	maxInt := strconv.Itoa(int(^uint(0) >> 1))
	for _, input := range []string{
		"", "18:25", "garbage", "-1:00:00", "00:60:00", "00:00:60",
		"18:60 min", "-1 sec", "+1 sec", "1.5 sec", "-1 h", "NaN h",
		"Inf h", "1e3 h", "1/2 h", "1.2.3 h", "1 h trailing",
		maxInt + ":00:00", maxInt + ":00 min", maxInt + " h", maxInt + "0 sec",
	} {
		t.Run(input, func(t *testing.T) {
			if got, err := parseImportedDuration(input); err == nil {
				t.Fatalf("accepted invalid duration %q as %d", input, got)
			}
		})
	}
}

func TestParseImportedTimeEntriesCSVIssue84(t *testing.T) {
	const content = `"User","Email","Client","Project","Task","Description","Billable","Start date","Start time","End date","End time","Duration","Tags"
"Andy","email@gmail.com","Customer Name","Project Name","","Update new/changed healthchecks","No","2026-08-21","19:21:21","2026-08-21","19:39:46","18:25 min","Maintenance"
`
	entries, err := parseImportedTimeEntriesCSV([]byte(content))
	if err != nil {
		t.Fatal(err)
	}
	if len(entries.Items) != 1 || entries.Items[0].Duration != 1105 {
		t.Fatalf("expected one entry with duration 1105, got %+v", entries)
	}
	_, err = parseImportedTimeEntriesCSV([]byte(strings.Replace(content, "18:25 min", "bad duration", 1)))
	if !errors.Is(err, ErrImportArchiveInvalid) || !strings.Contains(err.Error(), `"bad duration"`) || !strings.Contains(err.Error(), "row 2") {
		t.Fatalf("expected invalid duration value and row number, got %v", err)
	}
}
