// Package safehttp provides an HTTP client that refuses to connect to private,
// loopback, link-local, or cloud-metadata network ranges. It exists so that
// user-supplied URLs (webhook callbacks today, potentially exports, avatars,
// or other outbound fetches later) cannot turn the OpenToggl server into an
// SSRF pivot against its own host, other internal services, or cloud
// metadata endpoints such as 169.254.169.254.
package safehttp

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"syscall"
	"time"
)

// ErrForbiddenTarget is returned when the requested URL resolves to a network
// range that is not allowed for outbound traffic.
var ErrForbiddenTarget = errors.New("safehttp: target network is not allowed")

// Options configures a safehttp client.
type Options struct {
	// AllowPrivateTargets lifts the default SSRF guard. Set this only when the
	// operator explicitly opts in (for example, a local-network self-hosted
	// deployment that legitimately needs to reach an intranet webhook). Default
	// zero value is false, which is the safe production default.
	AllowPrivateTargets bool

	// RequestTimeout is the per-request deadline applied by the returned client.
	// Zero means 10s.
	RequestTimeout time.Duration

	// DialTimeout is the per-connection TCP dial deadline. Zero means 5s.
	DialTimeout time.Duration

	// Resolver is used to look up hostnames. Tests may inject a deterministic
	// resolver; nil means net.DefaultResolver.
	Resolver *net.Resolver
}

// NewClient returns an *http.Client whose Transport refuses connections to
// forbidden network ranges and whose redirect policy rejects redirect chains
// (so a 3xx cannot smuggle the client onto a forbidden target).
func NewClient(opts Options) *http.Client {
	requestTimeout := opts.RequestTimeout
	if requestTimeout <= 0 {
		requestTimeout = 10 * time.Second
	}
	dialTimeout := opts.DialTimeout
	if dialTimeout <= 0 {
		dialTimeout = 5 * time.Second
	}
	resolver := opts.Resolver
	if resolver == nil {
		resolver = net.DefaultResolver
	}

	allowPrivate := opts.AllowPrivateTargets

	dialer := &net.Dialer{
		Timeout: dialTimeout,
		// Control runs after the kernel resolves the socket address but before
		// the TCP handshake, catching DNS rebinding: even if DialContext
		// resolved to a public IP, the address presented at connect time is
		// rechecked here against the forbidden ranges.
		Control: func(_, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			ip := net.ParseIP(host)
			if ip == nil {
				// Control receives numeric addresses from the resolver, so a
				// parse failure here means something upstream is misbehaving.
				return ErrForbiddenTarget
			}
			if !allowPrivate && isForbiddenIP(ip) {
				return ErrForbiddenTarget
			}
			return nil
		},
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			ips, err := resolver.LookupIP(ctx, "ip", host)
			if err != nil {
				return nil, err
			}
			if len(ips) == 0 {
				return nil, fmt.Errorf("safehttp: no addresses for host %q", host)
			}
			if !allowPrivate {
				for _, ip := range ips {
					if isForbiddenIP(ip) {
						return nil, ErrForbiddenTarget
					}
				}
			}
			// Pin to the first resolved address so the dialer does not
			// re-resolve between the allow check and the actual connect.
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		},
	}

	return &http.Client{
		Timeout:   requestTimeout,
		Transport: transport,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			// Do not follow redirects. Following a redirect would require
			// re-running the allow check; returning ErrUseLastResponse leaves
			// the 3xx response for the caller to inspect without a second
			// outbound connection.
			return http.ErrUseLastResponse
		},
	}
}

// ValidateURL enforces the caller-visible URL contract: the URL must parse,
// must have a host, and must use a supported scheme. It is independent of the
// network-level guards applied by the client so that callers can reject
// obviously bad input before a DNS lookup happens.
func ValidateURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("safehttp: invalid URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("safehttp: only http and https are supported, got %q", parsed.Scheme)
	}
	if parsed.Host == "" {
		return errors.New("safehttp: URL is missing a host")
	}
	return nil
}

// isForbiddenIP returns true for any IP that should never be reachable via a
// user-supplied URL: loopback, private RFC1918/ULA, link-local (including the
// 169.254.169.254 cloud metadata endpoint), multicast, unspecified, CGNAT, and
// IPv6 loopback. Keeping this list explicit makes the guarantee auditable.
func isForbiddenIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() ||
		ip.IsUnspecified() {
		return true
	}
	for _, cidr := range extraForbiddenCIDRs {
		if cidr.Contains(ip) {
			return true
		}
	}
	return false
}

// extraForbiddenCIDRs covers ranges that Go's net.IP helpers do not classify
// as private but that we still refuse: CGNAT, IPv4 reserved blocks, and IPv6
// discard/documentation ranges.
var extraForbiddenCIDRs = func() []*net.IPNet {
	cidrs := []string{
		"100.64.0.0/10",     // RFC 6598 carrier-grade NAT
		"192.0.0.0/24",      // RFC 6890 IETF protocol assignments
		"192.0.2.0/24",      // RFC 5737 TEST-NET-1
		"198.18.0.0/15",     // RFC 2544 benchmarking
		"198.51.100.0/24",   // RFC 5737 TEST-NET-2
		"203.0.113.0/24",    // RFC 5737 TEST-NET-3
		"240.0.0.0/4",       // RFC 1112 reserved
		"255.255.255.255/32", // limited broadcast
		"::/128",            // IPv6 unspecified (extra safety)
		"2001:db8::/32",     // RFC 3849 documentation
	}
	parsed := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		if _, n, err := net.ParseCIDR(c); err == nil {
			parsed = append(parsed, n)
		}
	}
	return parsed
}()
