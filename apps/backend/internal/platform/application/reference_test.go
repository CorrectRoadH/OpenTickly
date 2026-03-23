package application

import "testing"

func TestReferenceServiceLoadsReferenceData(t *testing.T) {
	service, err := NewReferenceService()
	if err != nil {
		t.Fatalf("expected reference service to load, got %v", err)
	}

	countries := service.Countries()
	if len(countries) == 0 {
		t.Fatal("expected countries to be loaded")
	}

	foundChina := false
	for _, country := range countries {
		if country.ID == 156 && country.Code == "CN" {
			foundChina = true
			break
		}
	}
	if !foundChina {
		t.Fatalf("expected country id 156 for CN in countries list, got %#v", countries[:min(len(countries), 5)])
	}

	currencies := service.Currencies()
	if len(currencies) == 0 {
		t.Fatal("expected currencies to be loaded")
	}

	foundUSD := false
	for _, currency := range currencies {
		if currency.ISOCode == "USD" {
			foundUSD = true
			break
		}
	}
	if !foundUSD {
		t.Fatal("expected USD in currencies list")
	}

	timezones := service.Timezones()
	if len(timezones) == 0 {
		t.Fatal("expected timezones to be loaded")
	}

	offsets := service.Offsets()
	if len(offsets) == 0 {
		t.Fatal("expected offsets to be loaded")
	}
}

func min(left int, right int) int {
	if left < right {
		return left
	}
	return right
}
