package bootstrap

import "testing"

func TestEmailDomain(t *testing.T) {
	cases := map[string]string{
		"alice@example.com":   "example.com",
		"Bob@Example.COM":     "example.com",
		" carol@sub.acme.io ": "sub.acme.io",
		"no-at-sign":          "",
		"trailing@":           "",
		"":                    "",
	}
	for input, want := range cases {
		if got := emailDomain(input); got != want {
			t.Errorf("emailDomain(%q) = %q, want %q", input, got, want)
		}
	}
}
