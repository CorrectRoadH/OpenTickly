package platform

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
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

// Send delivers a single email. Returns an error if SMTP is not configured or delivery fails.
func (s *EmailSender) Send(_ context.Context, to string, subject string, bodyHTML string) error {
	if !s.IsConfigured() {
		return ErrSMTPNotConfigured
	}

	from := s.config.SenderAddr
	if from == "" {
		from = s.config.Username
	}

	msg := buildMIMEMessage(s.config.SenderName, from, to, subject, bodyHTML)
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)

	var auth smtp.Auth
	if s.config.Password != "" {
		auth = smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
	}

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
}

// SendTest sends a verification email to confirm SMTP is working.
func (s *EmailSender) SendTest(ctx context.Context, to string, siteURL string) error {
	subject := "OpenToggl SMTP Test"
	body := fmt.Sprintf(`<h2>SMTP Configuration Verified</h2>
<p>This is a test email from your OpenToggl instance.</p>
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
