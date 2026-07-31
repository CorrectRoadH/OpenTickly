package platform

import (
	"bufio"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"errors"
	"math/big"
	"net"
	"strings"
	"testing"
	"time"
)

// An SMTPS server answers with a TLS ClientHello, never a plaintext greeting.
// Dialling it in plaintext deadlocks both sides until the read deadline fires,
// which is exactly the "smtp handshake ...: i/o timeout" seen in production.
func TestNewSMTPClientImplicitTLSCompletesGreeting(t *testing.T) {
	tlsCfg, listener := startSMTPSServer(t)
	defer func() { _ = listener.Close() }()

	conn, err := net.DialTimeout("tcp", listener.Addr().String(), 2*time.Second)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))

	client, err := newSMTPClient(conn, listener.Addr().String(), "localhost", true, tlsCfg)
	if err != nil {
		t.Fatalf("expected implicit-TLS handshake to succeed, got %v", err)
	}
	defer func() { _ = client.Close() }()

	if ok, _ := client.Extension("AUTH"); !ok {
		t.Fatal("expected EHLO to be exchanged over the TLS connection")
	}
}

// Regression guard: a plaintext client against the same server must fail fast
// with a greeting/timeout error rather than appear to work.
func TestNewSMTPClientPlaintextAgainstSMTPSFails(t *testing.T) {
	_, listener := startSMTPSServer(t)
	defer func() { _ = listener.Close() }()

	conn, err := net.DialTimeout("tcp", listener.Addr().String(), 2*time.Second)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	_ = conn.SetDeadline(time.Now().Add(500 * time.Millisecond))

	client, err := newSMTPClient(conn, listener.Addr().String(), "localhost", false, &tls.Config{ServerName: "localhost"})
	if err == nil {
		_ = client.Close()
		t.Fatal("expected plaintext client against an implicit-TLS server to fail")
	}
	if code := ClassifySendFailure(err); code != SendFailureTimeout && code != SendFailureTLSFailed {
		t.Fatalf("expected timeout or tls_failed, got %q (%v)", code, err)
	}
}

func TestUsesImplicitTLSByPort(t *testing.T) {
	cases := []struct {
		port int
		want bool
	}{
		{port: 465, want: true},
		{port: 587, want: false},
		{port: 25, want: false},
		{port: 2525, want: false},
	}
	for _, tc := range cases {
		if got := (EmailConfig{Port: tc.port}).usesImplicitTLS(); got != tc.want {
			t.Fatalf("port %d: usesImplicitTLS = %v, want %v", tc.port, got, tc.want)
		}
	}
}

func TestSendReportsDialFailureAsConnectFailed(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	addr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("unexpected listener address type %T", listener.Addr())
	}
	closedPort := addr.Port
	_ = listener.Close() // nothing is listening on this port now

	sender := NewEmailSender(EmailConfig{
		Host:     "127.0.0.1",
		Port:     closedPort,
		Username: "user",
		Password: "secret",
	})
	err = sender.Send(context.Background(), "to@example.test", "subject", "<p>body</p>")
	if err == nil {
		t.Fatal("expected dial to a closed port to fail")
	}
	if code := ClassifySendFailure(err); code != SendFailureConnectFailed {
		t.Fatalf("expected connect_failed, got %q (%v)", code, err)
	}
}

func TestClassifySendFailure(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want SendFailureCode
	}{
		{name: "nil", err: nil, want: SendFailureNone},
		{name: "not configured", err: ErrSMTPNotConfigured, want: SendFailureNotConfigured},
		{name: "timeout", err: sendErr(StageGreeting, "host:465", timeoutError{}), want: SendFailureTimeout},
		{name: "tls", err: sendErr(StageTLS, "host:465", errors.New("bad certificate")), want: SendFailureTLSFailed},
		{name: "auth", err: sendErr(StageAuth, "host:587", errors.New("535 bad credentials")), want: SendFailureAuthFailed},
		{name: "recipient", err: sendErr(StageRecipient, "host:587", errors.New("550 no such user")), want: SendFailureRecipientRejected},
		{name: "delivery", err: sendErr(StageDelivery, "host:587", errors.New("451 try later")), want: SendFailureUnknown},
		{name: "other", err: errors.New("boom"), want: SendFailureUnknown},
	}
	for _, tc := range cases {
		if got := ClassifySendFailure(tc.err); got != tc.want {
			t.Fatalf("%s: got %q, want %q", tc.name, got, tc.want)
		}
	}
}

type timeoutError struct{}

func (timeoutError) Error() string { return "i/o timeout" }
func (timeoutError) Timeout() bool { return true }
func (timeoutError) Temporary() bool {
	return true
}

// startSMTPSServer runs a minimal SMTPS listener (TLS first, then greeting)
// and returns a client TLS config that trusts its self-signed certificate.
func startSMTPSServer(t *testing.T) (*tls.Config, net.Listener) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		DNSNames:     []string{"localhost"},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IsCA:         true,
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}
	leaf, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse certificate: %v", err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(leaf)

	listener, err := tls.Listen("tcp", "127.0.0.1:0", &tls.Config{
		Certificates: []tls.Certificate{{Certificate: [][]byte{der}, PrivateKey: key, Leaf: leaf}},
	})
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	go serveSMTPGreeting(listener)

	return &tls.Config{ServerName: "localhost", RootCAs: pool}, listener
}

// serveSMTPGreeting speaks just enough SMTP for a client handshake: banner,
// EHLO capabilities, then close on QUIT.
func serveSMTPGreeting(listener net.Listener) {
	for {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		go func(conn net.Conn) {
			defer func() { _ = conn.Close() }()
			_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
			if _, err := conn.Write([]byte("220 localhost ESMTP ready\r\n")); err != nil {
				return
			}
			reader := bufio.NewReader(conn)
			for {
				line, err := reader.ReadString('\n')
				if err != nil {
					return
				}
				command := strings.ToUpper(strings.TrimSpace(line))
				switch {
				case strings.HasPrefix(command, "EHLO"):
					_, err = conn.Write([]byte("250-localhost\r\n250 AUTH PLAIN\r\n"))
				case strings.HasPrefix(command, "QUIT"):
					_, _ = conn.Write([]byte("221 bye\r\n"))
					return
				default:
					_, err = conn.Write([]byte("250 ok\r\n"))
				}
				if err != nil {
					return
				}
			}
		}(conn)
	}
}
