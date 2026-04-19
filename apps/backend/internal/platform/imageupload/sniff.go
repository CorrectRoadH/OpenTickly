// Package imageupload centralizes the safety rules for user-supplied image
// uploads (avatars, workspace logos). All upload handlers must use this
// package so a single change to the allow list applies everywhere: accept PNG,
// JPEG, and WebP; reject everything else, especially SVG and HTML, which
// render as active content in the browser and would let a logged-in user
// pin a stored-XSS payload to any URL under /files/*.
package imageupload

import (
	"errors"
	"net/http"
)

// ErrUnsupportedImageType is returned when an uploaded blob's magic bytes do
// not match one of the accepted raster formats.
var ErrUnsupportedImageType = errors.New("imageupload: unsupported image type; accepted: image/png, image/jpeg, image/webp")

// ErrEmptyUpload is returned when the uploaded body is empty.
var ErrEmptyUpload = errors.New("imageupload: empty upload")

// MaxBytes is the per-file byte ceiling enforced by DetectAllowedImage.
// Two megabytes is generous for avatars and logos while keeping a single
// request from sitting on a lot of memory through io.ReadAll.
const MaxBytes = 2 * 1024 * 1024

var allowedTypes = map[string]struct{}{
	"image/png":  {},
	"image/jpeg": {},
	"image/webp": {},
}

// DetectAllowedImage inspects the first bytes of content via
// http.DetectContentType and returns the canonical content type if it matches
// the allow list. It deliberately ignores the content-type header supplied by
// the client: the client controls that header, so trusting it would defeat
// the point of this check. The returned content type is safe to persist as
// the authoritative type of the stored blob.
func DetectAllowedImage(content []byte) (string, error) {
	if len(content) == 0 {
		return "", ErrEmptyUpload
	}
	if len(content) > MaxBytes {
		return "", ErrUnsupportedImageType
	}
	// http.DetectContentType looks at up to the first 512 bytes and returns
	// a MIME type plus (for images) a charset parameter we do not want to
	// carry through. Splitting on ';' keeps only the MIME type itself.
	detected := http.DetectContentType(content)
	if i := indexByte(detected, ';'); i >= 0 {
		detected = detected[:i]
	}
	if _, ok := allowedTypes[detected]; !ok {
		return "", ErrUnsupportedImageType
	}
	return detected, nil
}

func indexByte(s string, c byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == c {
			return i
		}
	}
	return -1
}

// CanonicalExtension returns the dotted file extension that corresponds to a
// sniffed content type. Callers use it to build stable storage keys from the
// authoritative (sniffed) type instead of the user's filename, which is
// attacker-controlled.
func CanonicalExtension(contentType string) string {
	switch contentType {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	default:
		return ""
	}
}
