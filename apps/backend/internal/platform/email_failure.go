package platform

import (
	"context"
	"errors"
	"net"
)

// SendFailureCode is the machine-readable outcome of a delivery attempt,
// matching the `code` enum of TestEmailResult in openapi/opentoggl-admin.openapi.json.
// Clients localise the code; the raw error text stays diagnostic detail.
type SendFailureCode string

const (
	SendFailureNone              SendFailureCode = "sent"
	SendFailureNotConfigured     SendFailureCode = "not_configured"
	SendFailureConnectFailed     SendFailureCode = "connect_failed"
	SendFailureTLSFailed         SendFailureCode = "tls_failed"
	SendFailureAuthFailed        SendFailureCode = "auth_failed"
	SendFailureRecipientRejected SendFailureCode = "recipient_rejected"
	SendFailureTimeout           SendFailureCode = "timeout"
	SendFailureUnknown           SendFailureCode = "unknown"
)

// ClassifySendFailure maps a delivery error to the outcome code clients render.
func ClassifySendFailure(err error) SendFailureCode {
	if err == nil {
		return SendFailureNone
	}
	if errors.Is(err, ErrSMTPNotConfigured) {
		return SendFailureNotConfigured
	}
	if isTimeout(err) {
		return SendFailureTimeout
	}

	var sendError *SendError
	if !errors.As(err, &sendError) {
		return SendFailureUnknown
	}
	switch sendError.Stage {
	case StageDial:
		return SendFailureConnectFailed
	case StageTLS:
		return SendFailureTLSFailed
	case StageGreeting:
		// A server that never answers plaintext is almost always speaking
		// implicit TLS on a port we dialled in plaintext (or vice versa).
		return SendFailureTLSFailed
	case StageAuth:
		return SendFailureAuthFailed
	case StageRecipient:
		return SendFailureRecipientRejected
	default:
		return SendFailureUnknown
	}
}

func isTimeout(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}

// ClassifyFailure exposes ClassifySendFailure as a method so callers holding
// the sender through an interface can classify without importing platform.
func (s *EmailSender) ClassifyFailure(err error) string {
	return string(ClassifySendFailure(err))
}
