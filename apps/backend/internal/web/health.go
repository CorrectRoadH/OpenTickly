package web

import (
	"context"
	"errors"
	"net"
	"net/url"
	"time"
)

const (
	StatusOK    = "ok"
	StatusError = "error"
)

type HealthSnapshot struct {
	Service string   `json:"service"`
	Status  string   `json:"status"`
	Modules []string `json:"modules"`
}

type ReadinessProbe interface {
	Check(context.Context) ReadinessReport
}

type ReadinessReport struct {
	Service string           `json:"service"`
	Status  string           `json:"status"`
	Checks  []ReadinessCheck `json:"checks"`
}

type ReadinessCheck struct {
	Name    string `json:"name"`
	Status  string `json:"status"`
	Target  string `json:"target,omitempty"`
	Message string `json:"message,omitempty"`
}

type RuntimeReadinessConfig struct {
	Service     string
	DatabaseURL string
	RedisURL    string
	Timeout     time.Duration
}

type staticReadinessProbe struct {
	report ReadinessReport
}

type runtimeReadinessProbe struct {
	service     string
	databaseURL string
	redisURL    string
	timeout     time.Duration
}

func NewHealthSnapshot(service string, modules []string) HealthSnapshot {
	return HealthSnapshot{
		Service: service,
		Status:  StatusOK,
		Modules: modules,
	}
}

func NewStaticReadinessProbe(service string) ReadinessProbe {
	return staticReadinessProbe{
		report: ReadinessReport{
			Service: service,
			Status:  StatusOK,
			Checks: []ReadinessCheck{
				{
					Name:   "server",
					Status: StatusOK,
				},
			},
		},
	}
}

func NewRuntimeReadinessProbe(cfg RuntimeReadinessConfig) ReadinessProbe {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 500 * time.Millisecond
	}

	return runtimeReadinessProbe{
		service:     cfg.Service,
		databaseURL: cfg.DatabaseURL,
		redisURL:    cfg.RedisURL,
		timeout:     timeout,
	}
}

func (probe staticReadinessProbe) Check(context.Context) ReadinessReport {
	return probe.report
}

func (probe runtimeReadinessProbe) Check(ctx context.Context) ReadinessReport {
	checks := []ReadinessCheck{
		probe.configurationCheck(),
		probe.tcpDependencyCheck(ctx, "postgres", probe.databaseURL, "5432"),
		probe.tcpDependencyCheck(ctx, "redis", probe.redisURL, "6379"),
	}

	status := StatusOK
	for _, check := range checks {
		if check.Status != StatusOK {
			status = StatusError
			break
		}
	}

	return ReadinessReport{
		Service: probe.service,
		Status:  status,
		Checks:  checks,
	}
}

func (probe runtimeReadinessProbe) configurationCheck() ReadinessCheck {
	switch {
	case probe.service == "":
		return ReadinessCheck{
			Name:    "configuration",
			Status:  StatusError,
			Message: "service name is missing",
		}
	case probe.databaseURL == "":
		return ReadinessCheck{
			Name:    "configuration",
			Status:  StatusError,
			Message: "database url is missing",
		}
	case probe.redisURL == "":
		return ReadinessCheck{
			Name:    "configuration",
			Status:  StatusError,
			Message: "redis url is missing",
		}
	default:
		return ReadinessCheck{
			Name:    "configuration",
			Status:  StatusOK,
			Message: "required runtime configuration loaded",
		}
	}
}

func (probe runtimeReadinessProbe) tcpDependencyCheck(
	ctx context.Context,
	name string,
	rawURL string,
	defaultPort string,
) ReadinessCheck {
	target, address, err := networkTarget(rawURL, defaultPort)
	if err != nil {
		return ReadinessCheck{
			Name:    name,
			Status:  StatusError,
			Message: err.Error(),
		}
	}

	checkCtx, cancel := context.WithTimeout(ctx, probe.timeout)
	defer cancel()

	connection, err := (&net.Dialer{}).DialContext(checkCtx, "tcp", address)
	if err != nil {
		return ReadinessCheck{
			Name:    name,
			Status:  StatusError,
			Target:  target,
			Message: err.Error(),
		}
	}
	_ = connection.Close()

	return ReadinessCheck{
		Name:    name,
		Status:  StatusOK,
		Target:  target,
		Message: "tcp connectivity ok",
	}
}

func networkTarget(rawURL string, defaultPort string) (target string, address string, err error) {
	if rawURL == "" {
		return "", "", errors.New("dependency url is missing")
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", "", err
	}

	host := parsedURL.Hostname()
	if host == "" {
		return "", "", errors.New("dependency host is missing")
	}

	port := parsedURL.Port()
	if port == "" {
		port = defaultPort
	}

	target = net.JoinHostPort(host, port)
	return target, target, nil
}
