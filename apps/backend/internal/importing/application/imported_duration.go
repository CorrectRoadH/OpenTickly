package application

import (
	"errors"
	"math/big"
	"regexp"
	"strconv"
	"strings"
)

var importedDecimalHours = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?$`)

func parseImportedDuration(value string) (int, error) {
	value = strings.TrimSpace(value)
	if hours, ok := strings.CutSuffix(value, " h"); ok {
		return parseImportedDecimalHours(hours)
	}
	partCount := 3
	if minutes, ok := strings.CutSuffix(value, " min"); ok {
		value, partCount = minutes, 2
	} else if seconds, ok := strings.CutSuffix(value, " sec"); ok {
		value, partCount = seconds, 1
	}
	parts := strings.Split(value, ":")
	if len(parts) != partCount {
		return 0, errors.New("invalid duration format")
	}
	maxInt := int(^uint(0) >> 1)
	total := 0
	for index, part := range parts {
		if part == "" || strings.ContainsAny(part, "+-") {
			return 0, errors.New("invalid duration component")
		}
		component, err := strconv.Atoi(part)
		if err != nil {
			return 0, err
		}
		if index > 0 && component >= 60 {
			return 0, errors.New("duration component out of range")
		}
		if total > (maxInt-component)/60 {
			return 0, errors.New("duration overflow")
		}
		total = total*60 + component
	}
	return total, nil
}

// Decimal-hour exports can lose subsecond precision; round to the nearest second,
// with half seconds rounding up, using exact arithmetic before checking int range.
func parseImportedDecimalHours(value string) (int, error) {
	if !importedDecimalHours.MatchString(value) {
		return 0, errors.New("invalid decimal hours")
	}
	hours, ok := new(big.Rat).SetString(value)
	if !ok {
		return 0, errors.New("invalid decimal hours")
	}
	seconds := new(big.Rat).Mul(hours, big.NewRat(3600, 1))
	seconds.Add(seconds, big.NewRat(1, 2))
	rounded := new(big.Int).Quo(seconds.Num(), seconds.Denom())
	maxInt := int64(^uint(0) >> 1)
	if !rounded.IsInt64() || rounded.Int64() > maxInt {
		return 0, errors.New("duration overflow")
	}
	return int(rounded.Int64()), nil
}
