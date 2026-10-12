package application

import (
	"fmt"
	"math"
)

// DurationRounding transforms report durations without changing tracked entries.
// Mode matches workspace settings: -1 down, 0 nearest, 1 up. Zero minutes disables it.
type DurationRounding struct {
	Mode    int
	Minutes int
}

func NewDurationRounding(mode, minutes int) (DurationRounding, error) {
	if mode < -1 || mode > 1 {
		return DurationRounding{}, fmt.Errorf("rounding must be -1, 0, or 1")
	}
	if minutes < 0 || minutes > math.MaxInt/60 {
		return DurationRounding{}, fmt.Errorf("rounding_minutes is out of range")
	}
	return DurationRounding{Mode: mode, Minutes: minutes}, nil
}

func (rounding DurationRounding) Apply(seconds int) (int, error) {
	if rounding.Minutes == 0 || seconds <= 0 {
		return seconds, nil
	}
	interval := rounding.Minutes * 60
	remainder := seconds % interval
	rounded := seconds - remainder
	if rounding.Mode == 1 && remainder > 0 || rounding.Mode == 0 && remainder >= (interval+1)/2 {
		if rounded > math.MaxInt-interval {
			return 0, fmt.Errorf("rounded duration is out of range")
		}
		rounded += interval
	}
	return rounded, nil
}
