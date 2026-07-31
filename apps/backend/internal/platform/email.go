package platform

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// EmailConfig holds SMTP connection parameters.
type EmailConfig struct {
	Host       string
	Port       int
	Username   string
	Password   string
	SenderName string
	SenderAddr string
}

// EmailSender sends emails via SMTP.
type EmailSender struct {
	config EmailConfig
}

func NewEmailSender(config EmailConfig) *EmailSender {
	return &EmailSender{config: config}
}

// IsConfigured returns true if the sender has enough config to attempt delivery.
func (s *EmailSender) IsConfigured() bool {
	return s.config.Host != "" && s.config.Username != ""
}

// smtpDialTimeout bounds the TCP handshake with the SMTP server.
const smtpDialTimeout = 5 * time.Second

// smtpIOTimeout bounds the SMTP conversation once connected
// (TLS → EHLO → STARTTLS → AUTH → MAIL → RCPT → DATA → QUIT).
const smtpIOTimeout = 5 * time.Second

// smtpsPort is the IANA port for implicit TLS ("SMTPS"). A server listening
// here expects a TLS ClientHello immediately and never sends a plaintext
// greeting, so a plaintext client blocks until its read deadline expires.
const smtpsPort = 465

// usesImplicitTLS reports whether the connection must be wrapped in TLS before
// the SMTP greeting instead of upgrading later via STARTTLS.
func (c EmailConfig) usesImplicitTLS() bool {
	return c.Port == smtpsPort
}

// SendStage names the step of the SMTP conversation that failed, so callers can
// turn a delivery failure into an actionable message without parsing strings.
type SendStage string

const (
	StageDial      SendStage = "dial"
	StageTLS       SendStage = "tls"
	StageGreeting  SendStage = "greeting"
	StageAuth      SendStage = "auth"
	StageRecipient SendStage = "recipient"
	StageDelivery  SendStage = "delivery"
)

// SendError carries the failed stage alongside the underlying SMTP error.
type SendError struct {
	Stage SendStage
	Addr  string
	Err   error
}

func (e *SendError) Error() string {
	return fmt.Sprintf("smtp %s %s: %v", e.Stage, e.Addr, e.Err)
}

func (e *SendError) Unwrap() error { return e.Err }

func sendErr(stage SendStage, addr string, err error) error {
	return &SendError{Stage: stage, Addr: addr, Err: err}
}

// Send delivers a single email. Returns an error if SMTP is not configured
// or delivery fails. Connect and I/O are bounded by timeouts so a dead or
// firewalled SMTP host fails fast instead of hanging indefinitely.
//
// The `net/smtp.SendMail` helper in the stdlib does *not* apply any timeout,
// ignores context cancellation, and only speaks STARTTLS — which is why a
// misconfigured host used to freeze the Send-Test-Email request, and why an
// implicit-TLS port (465) timed out waiting for a greeting that never comes.
// We drive the SMTP conversation manually so we can pick the right TLS mode,
// set both a dial timeout and a per-operation deadline, and let ctx
// cancellation abort the dial.
func (s *EmailSender) Send(ctx context.Context, to string, subject string, bodyHTML string) error {
	if !s.IsConfigured() {
		return ErrSMTPNotConfigured
	}

	from := s.config.SenderAddr
	if from == "" {
		from = s.config.Username
	}

	msg := buildMIMEMessage(s.config.SenderName, from, to, subject, bodyHTML)
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)

	dialer := &net.Dialer{Timeout: smtpDialTimeout}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return sendErr(StageDial, addr, err)
	}
	// Bound the rest of the conversation. Refreshed after each major step.
	_ = conn.SetDeadline(time.Now().Add(smtpIOTimeout))

	client, err := newSMTPClient(conn, addr, s.config.Host, s.config.usesImplicitTLS(), &tls.Config{ServerName: s.config.Host})
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer func() {
		_ = client.Close()
	}()

	if s.config.Password != "" {
		auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
		if err := client.Auth(auth); err != nil {
			return sendErr(StageAuth, addr, err)
		}
	}

	_ = conn.SetDeadline(time.Now().Add(smtpIOTimeout))

	if err := client.Mail(from); err != nil {
		return sendErr(StageDelivery, addr, fmt.Errorf("MAIL FROM %q: %w", from, err))
	}
	if err := client.Rcpt(to); err != nil {
		return sendErr(StageRecipient, addr, fmt.Errorf("RCPT TO %q: %w", to, err))
	}
	w, err := client.Data()
	if err != nil {
		return sendErr(StageDelivery, addr, fmt.Errorf("DATA: %w", err))
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		return sendErr(StageDelivery, addr, fmt.Errorf("write body: %w", err))
	}
	if err := w.Close(); err != nil {
		return sendErr(StageDelivery, addr, fmt.Errorf("close body: %w", err))
	}
	if err := client.Quit(); err != nil && !errors.Is(err, net.ErrClosed) {
		return sendErr(StageDelivery, addr, fmt.Errorf("QUIT: %w", err))
	}
	return nil
}

// newSMTPClient completes the transport handshake on an established connection:
// implicit TLS before the greeting for SMTPS ports, otherwise a plaintext
// greeting upgraded via STARTTLS when the server advertises it.
func newSMTPClient(conn net.Conn, addr string, host string, implicitTLS bool, tlsCfg *tls.Config) (*smtp.Client, error) {
	if implicitTLS {
		tlsConn := tls.Client(conn, tlsCfg)
		if err := tlsConn.Handshake(); err != nil {
			return nil, sendErr(StageTLS, addr, err)
		}
		conn = tlsConn
	}

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return nil, sendErr(StageGreeting, addr, err)
	}

	if !implicitTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(tlsCfg); err != nil {
				_ = client.Close()
				return nil, sendErr(StageTLS, addr, err)
			}
		}
	}
	return client, nil
}

// SendTest sends a verification email to confirm SMTP is working.
func (s *EmailSender) SendTest(ctx context.Context, to string, siteURL string) error {
	subject := "OpenTickly SMTP Test"
	body := fmt.Sprintf(`<h2>SMTP Configuration Verified</h2>
<p>This is a test email from your OpenTickly instance.</p>
<p>Site URL: <a href="%s">%s</a></p>
<p>If you received this email, your SMTP settings are working correctly.</p>`,
		siteURL, siteURL)
	return s.Send(ctx, to, subject, body)
}

func buildMIMEMessage(senderName, from, to, subject, bodyHTML string) string {
	var sb strings.Builder
	senderName = sanitizeMIMEHeaderValue(senderName)
	from = sanitizeMIMEHeaderValue(from)
	to = sanitizeMIMEHeaderValue(to)
	subject = sanitizeMIMEHeaderValue(subject)
	if senderName != "" {
		sb.WriteString(fmt.Sprintf("From: %s <%s>\r\n", senderName, from))
	} else {
		sb.WriteString(fmt.Sprintf("From: %s\r\n", from))
	}
	sb.WriteString(fmt.Sprintf("To: %s\r\n", to))
	sb.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(bodyHTML)
	return sb.String()
}

func sanitizeMIMEHeaderValue(value string) string {
	fields := strings.FieldsFunc(value, func(r rune) bool {
		return r == '\r' || r == '\n'
	})
	return strings.Join(fields, " ")
}

// ErrSMTPNotConfigured is returned when email delivery is attempted without SMTP config.
var ErrSMTPNotConfigured = fmt.Errorf("SMTP is not configured")
