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
// (EHLO → STARTTLS → AUTH → MAIL → RCPT → DATA → QUIT).
const smtpIOTimeout = 5 * time.Second

// Send delivers a single email. Returns an error if SMTP is not configured
// or delivery fails. Connect and I/O are bounded by timeouts so a dead or
// firewalled SMTP host fails fast instead of hanging indefinitely.
//
// The `net/smtp.SendMail` helper in the stdlib does *not* apply any timeout
// and ignores context cancellation — which is why a misconfigured host used
// to freeze the Send-Test-Email request for ~75s per resolved IP. We drive
// the SMTP conversation manually so we can set both a dial timeout and a
// per-operation deadline, and so ctx cancellation aborts the dial.
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
		return fmt.Errorf("smtp dial %s: %w", addr, err)
	}
	// Bound the rest of the conversation. Refreshed after each major step.
	_ = conn.SetDeadline(time.Now().Add(smtpIOTimeout))

	client, err := smtp.NewClient(conn, s.config.Host)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("smtp handshake %s: %w", addr, err)
	}
	defer func() {
		_ = client.Close()
	}()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: s.config.Host}); err != nil {
			return fmt.Errorf("smtp STARTTLS: %w", err)
		}
	}

	if s.config.Password != "" {
		auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	_ = conn.SetDeadline(time.Now().Add(smtpIOTimeout))

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("smtp MAIL FROM %q: %w", from, err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp RCPT TO %q: %w", to, err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp DATA: %w", err)
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		return fmt.Errorf("smtp write body: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close body: %w", err)
	}
	if err := client.Quit(); err != nil && !errors.Is(err, net.ErrClosed) {
		return fmt.Errorf("smtp QUIT: %w", err)
	}
	return nil
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

// ErrSMTPNotConfigured is returned when email delivery is attempted without SMTP config.
var ErrSMTPNotConfigured = fmt.Errorf("SMTP is not configured")
