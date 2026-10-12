package application

import (
	"math"
	"testing"
)

func TestDurationRounding(t *testing.T) {
	for _, tc := range []struct{ mode, minutes, seconds, want int }{
		{0, 5, 149, 0}, {0, 5, 150, 300}, {0, 5, 151, 300}, {0, 5, 450, 600},
		{1, 5, 300, 300}, {1, 5, 301, 600}, {-1, 5, 299, 0}, {-1, 5, 300, 300},
		{1, 15, 0, 0}, {0, 0, 123, 123}, {1, 0, 123, 123}, {1, 5, -1, -1},
	} {
		rounding, err := NewDurationRounding(tc.mode, tc.minutes)
		if err != nil {
			t.Fatal(err)
		}
		if got, err := rounding.Apply(tc.seconds); err != nil || got != tc.want {
			t.Errorf("%+v: got %d, err %v", tc, got, err)
		}
	}
	for _, tc := range []struct{ mode, minutes int }{{2, 5}, {-2, 5}, {0, -1}} {
		if _, err := NewDurationRounding(tc.mode, tc.minutes); err == nil {
			t.Errorf("accepted %+v", tc)
		}
	}
}

func TestDurationRoundingRejectsResultOverflow(t *testing.T) {
	rounding, err := NewDurationRounding(1, 5)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := rounding.Apply(math.MaxInt); err == nil {
		t.Fatal("accepted overflowing rounded duration")
	}
}
