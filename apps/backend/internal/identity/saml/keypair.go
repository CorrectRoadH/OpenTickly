package saml

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"time"
)

// Keypair is the Service Provider's signing material. A single instance-wide
// self-signed keypair signs AuthnRequests and metadata for every workspace; the
// PEM-encoded forms are persisted so the SP identity is stable across restarts.
type Keypair struct {
	Key            *rsa.PrivateKey
	Certificate    *x509.Certificate
	PrivateKeyPEM  string
	CertificatePEM string
}

// GenerateKeypair creates a fresh 2048-bit RSA self-signed Service Provider
// certificate valid for 10 years.
func GenerateKeypair() (Keypair, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return Keypair{}, err
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return Keypair{}, err
	}

	template := x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: "OpenTickly SAML Service Provider"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().AddDate(10, 0, 0),
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
	}

	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return Keypair{}, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return Keypair{}, err
	}

	keyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})

	return Keypair{
		Key:            key,
		Certificate:    cert,
		PrivateKeyPEM:  string(keyPEM),
		CertificatePEM: string(certPEM),
	}, nil
}

// ParseKeypair rebuilds a Keypair from its persisted PEM forms.
func ParseKeypair(privateKeyPEM, certificatePEM string) (Keypair, error) {
	keyBlock, _ := pem.Decode([]byte(privateKeyPEM))
	if keyBlock == nil {
		return Keypair{}, errors.New("saml: invalid SP private key PEM")
	}
	key, err := x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
	if err != nil {
		return Keypair{}, fmt.Errorf("saml: parse SP private key: %w", err)
	}

	certBlock, _ := pem.Decode([]byte(certificatePEM))
	if certBlock == nil {
		return Keypair{}, errors.New("saml: invalid SP certificate PEM")
	}
	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return Keypair{}, fmt.Errorf("saml: parse SP certificate: %w", err)
	}

	return Keypair{
		Key:            key,
		Certificate:    cert,
		PrivateKeyPEM:  privateKeyPEM,
		CertificatePEM: certificatePEM,
	}, nil
}
