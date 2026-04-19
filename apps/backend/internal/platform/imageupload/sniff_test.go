package imageupload

import (
	"bytes"
	"errors"
	"testing"
)

// Minimal magic-byte fixtures that DetectContentType recognises. Real images
// are larger, but DetectContentType only reads the sniff buffer, so these
// headers are enough to exercise the allow list deterministically.
var (
	pngHeader  = []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}
	jpegHeader = []byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'}
	webpHeader = append([]byte("RIFF\x00\x00\x00\x00WEBPVP8 "), bytes.Repeat([]byte{0}, 16)...)
	svgBody    = []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)
	htmlBody   = []byte(`<!DOCTYPE html><html><body><script>alert(1)</script></body></html>`)
	plainText  = []byte(`just some text, not an image`)
)

func TestDetectAllowedImage_Accepts(t *testing.T) {
	cases := map[string][]byte{
		"image/png":  pngHeader,
		"image/jpeg": jpegHeader,
		"image/webp": webpHeader,
	}
	for want, content := range cases {
		got, err := DetectAllowedImage(content)
		if err != nil {
			t.Errorf("expected %s to be accepted, got %v", want, err)
			continue
		}
		if got != want {
			t.Errorf("expected content type %q, got %q", want, got)
		}
	}
}

func TestDetectAllowedImage_RejectsSVG(t *testing.T) {
	_, err := DetectAllowedImage(svgBody)
	if !errors.Is(err, ErrUnsupportedImageType) {
		t.Fatalf("expected ErrUnsupportedImageType for SVG, got %v", err)
	}
}

func TestDetectAllowedImage_RejectsHTML(t *testing.T) {
	_, err := DetectAllowedImage(htmlBody)
	if !errors.Is(err, ErrUnsupportedImageType) {
		t.Fatalf("expected ErrUnsupportedImageType for HTML, got %v", err)
	}
}

func TestDetectAllowedImage_RejectsPlainText(t *testing.T) {
	_, err := DetectAllowedImage(plainText)
	if !errors.Is(err, ErrUnsupportedImageType) {
		t.Fatalf("expected ErrUnsupportedImageType for text, got %v", err)
	}
}

func TestDetectAllowedImage_RejectsEmpty(t *testing.T) {
	_, err := DetectAllowedImage(nil)
	if !errors.Is(err, ErrEmptyUpload) {
		t.Fatalf("expected ErrEmptyUpload, got %v", err)
	}
}

func TestDetectAllowedImage_RejectsOversize(t *testing.T) {
	oversized := bytes.Repeat([]byte{0xFF, 0xD8, 0xFF, 0xE0}, MaxBytes)
	_, err := DetectAllowedImage(oversized)
	if !errors.Is(err, ErrUnsupportedImageType) {
		t.Fatalf("expected oversize upload to be rejected, got %v", err)
	}
}
