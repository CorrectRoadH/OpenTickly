package xptr

import "time"

func Clone[T any](value *T) *T {
	if value == nil {
		return nil
	}

	cloned := *value
	return &cloned
}

func CloneUTC(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}

	utc := value.UTC()
	return &utc
}
