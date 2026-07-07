package application

import (
	"bufio"
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	xcurrency "golang.org/x/text/currency"
	"golang.org/x/text/language"
	"golang.org/x/text/language/display"
)

type Country struct {
	ID                 int
	Code               string
	Name               string
	DefaultCurrencyISO string
}

type Currency struct {
	ID      int
	ISOCode string
	Symbol  string
}

type Timezone struct {
	Name string
	UTC  string
}

type ReferenceService struct {
	countries  []Country
	currencies []Currency
	timezones  []Timezone
	offsets    []string
}

func NewReferenceService() (*ReferenceService, error) {
	countries, timezones, err := loadCountriesAndTimezones()
	if err != nil {
		return nil, err
	}
	currencies := buildCurrencies(countries)
	offsets := buildOffsets(timezones)

	return &ReferenceService{
		countries:  countries,
		currencies: currencies,
		timezones:  timezones,
		offsets:    offsets,
	}, nil
}

func (service *ReferenceService) Countries() []Country {
	return slices.Clone(service.countries)
}

func (service *ReferenceService) CountryByID(countryID int64) (Country, bool) {
	for _, country := range service.countries {
		if int64(country.ID) == countryID {
			return country, true
		}
	}
	return Country{}, false
}

func (service *ReferenceService) Currencies() []Currency {
	return slices.Clone(service.currencies)
}

func (service *ReferenceService) Timezones() []Timezone {
	return slices.Clone(service.timezones)
}

func (service *ReferenceService) Offsets() []string {
	return slices.Clone(service.offsets)
}

func loadCountriesAndTimezones() ([]Country, []Timezone, error) {
	file, err := openZoneTab()
	if err != nil {
		return nil, nil, err
	}
	defer file.Close()

	countryByID := make(map[int]Country)
	timezones := make([]Timezone, 0)
	now := time.Now().UTC()
	regionNamer := display.English.Regions()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}

		for _, rawCode := range strings.Split(fields[0], ",") {
			region, err := language.ParseRegion(strings.TrimSpace(rawCode))
			if err != nil || !region.IsCountry() {
				continue
			}

			countryID := region.M49()
			if _, exists := countryByID[countryID]; exists {
				continue
			}

			country := Country{
				ID:   countryID,
				Code: region.String(),
				Name: regionNamer.Name(region),
			}
			if unit, ok := xcurrency.FromRegion(region); ok {
				country.DefaultCurrencyISO = unit.String()
			}
			countryByID[countryID] = country
		}

		location, err := time.LoadLocation(fields[2])
		if err != nil {
			continue
		}
		_, offsetSeconds := now.In(location).Zone()
		timezones = append(timezones, Timezone{
			Name: fields[2],
			UTC:  formatUTCOffset(offsetSeconds),
		})
	}
	if err := scanner.Err(); err != nil {
		return nil, nil, fmt.Errorf("scan zone tab: %w", err)
	}

	countries := make([]Country, 0, len(countryByID))
	for _, country := range countryByID {
		countries = append(countries, country)
	}
	slices.SortFunc(countries, func(left Country, right Country) int {
		return strings.Compare(left.Name, right.Name)
	})
	slices.SortFunc(timezones, func(left Timezone, right Timezone) int {
		return strings.Compare(left.Name, right.Name)
	})

	return countries, timezones, nil
}

func buildCurrencies(countries []Country) []Currency {
	currencyByISO := make(map[string]Currency)
	nextID := 1
	for _, country := range countries {
		if country.DefaultCurrencyISO == "" {
			continue
		}
		if _, exists := currencyByISO[country.DefaultCurrencyISO]; exists {
			continue
		}

		unit := xcurrency.MustParseISO(country.DefaultCurrencyISO)
		symbol := currencySymbol(unit)
		currencyByISO[country.DefaultCurrencyISO] = Currency{
			ID:      nextID,
			ISOCode: country.DefaultCurrencyISO,
			Symbol:  symbol,
		}
		nextID++
	}

	currencies := make([]Currency, 0, len(currencyByISO))
	for _, currency := range currencyByISO {
		currencies = append(currencies, currency)
	}
	slices.SortFunc(currencies, func(left Currency, right Currency) int {
		return strings.Compare(left.ISOCode, right.ISOCode)
	})
	for index := range currencies {
		currencies[index].ID = index + 1
	}
	return currencies
}

func buildOffsets(timezones []Timezone) []string {
	seen := make(map[string]struct{})
	offsets := make([]string, 0)
	for _, timezone := range timezones {
		if _, exists := seen[timezone.UTC]; exists {
			continue
		}
		seen[timezone.UTC] = struct{}{}
		offsets = append(offsets, timezone.UTC)
	}
	slices.Sort(offsets)
	return offsets
}

func openZoneTab() (*os.File, error) {
	for _, path := range []string{
		"/usr/share/zoneinfo/zone.tab",
		"/usr/share/zoneinfo/zone1970.tab",
	} {
		file, err := os.Open(path)
		if err == nil {
			return file, nil
		}
		if !os.IsNotExist(err) {
			return nil, err
		}
	}
	return nil, fmt.Errorf("zone tab not found")
}

func formatUTCOffset(offsetSeconds int) string {
	sign := "+"
	if offsetSeconds < 0 {
		sign = "-"
		offsetSeconds = -offsetSeconds
	}
	hours := offsetSeconds / 3600
	minutes := (offsetSeconds % 3600) / 60
	return "UTC" + sign + leftPad2(hours) + ":" + leftPad2(minutes)
}

func leftPad2(value int) string {
	if value < 10 {
		return "0" + strconv.Itoa(value)
	}
	return strconv.Itoa(value)
}

func currencySymbol(unit xcurrency.Unit) string {
	value := fmt.Sprint(xcurrency.Symbol(unit.Amount(1)))
	if symbol, _, ok := strings.Cut(value, " "); ok && symbol != "" {
		return symbol
	}
	return unit.String()
}
