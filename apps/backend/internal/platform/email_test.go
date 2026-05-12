package platform

import (
	"strings"
	"testing"
)

func TestBuildMIMEMessageStripsHeaderLineBreaks(t *testing.T) {
	message := buildMIMEMessage(
		"OpenTickly\r\nBcc: attacker@example.test",
		"sender@example.test",
		"recipient@example.test",
		"Invite\r\nBcc: attacker@example.test",
		"<p>Hello</p>",
	)

	headerBlock, _, _ := strings.Cut(message, "\r\n\r\n")
	if strings.Contains(headerBlock, "\r\nBcc: attacker@example.test") {
		t.Fatalf("expected MIME headers to reject injected Bcc header, got:\n%s", headerBlock)
	}
	if !strings.Contains(headerBlock, "Subject: Invite Bcc: attacker@example.test") {
		t.Fatalf("expected subject line breaks to be folded into spaces, got:\n%s", headerBlock)
	}
}
