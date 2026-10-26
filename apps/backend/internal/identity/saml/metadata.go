package saml

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
	"opentoggl/backend/apps/backend/internal/platform/safehttp"
)

const metadataLimit = 1 << 20

func newMetadataClient() *http.Client {
	return safehttp.NewClient(safehttp.Options{RequestTimeout: 10 * time.Second})
}

func ValidateHTTPSURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.Fragment != "" || strings.ContainsAny(raw, "#\\") {
		return errors.New("SAML requires an HTTPS URL without credentials or fragments")
	}
	return nil
}

func ValidateMetadataURL(raw string) error {
	if err := ValidateHTTPSURL(raw); err != nil {
		return err
	}
	u, _ := url.Parse(raw)
	if port := u.Port(); port != "" && port != "443" {
		return errors.New("SAML metadata requires HTTPS port 443")
	}
	return nil
}

func fetchMetadata(ctx context.Context, raw string, client *http.Client) (*saml.EntityDescriptor, error) {
	if err := ValidateMetadataURL(raw); err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		return nil, err
	}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, errors.New("SAML metadata endpoint did not return HTTP 200")
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, metadataLimit+1))
	if err != nil {
		return nil, err
	}
	if len(body) > metadataLimit {
		return nil, errors.New("SAML metadata exceeds one MiB")
	}
	return samlsp.ParseMetadata(body)
}
