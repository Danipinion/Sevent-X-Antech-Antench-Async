package storage

import (
	"bytes"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

const (
	MaxPhotoSizeBytes = 5 * 1024 * 1024   // 5 MB
	MaxVideoSizeBytes = 25 * 1024 * 1024  // 25 MB
	MinFileSizeBytes  = 100               // 100 Bytes
)

var (
	ErrFileTooSmall         = errors.New("ukuran berkas terlalu kecil atau kosong (minimal 100 byte)")
	ErrPhotoTooLarge        = errors.New("ukuran foto melebihi batas maksimal 5 MB")
	ErrVideoTooLarge        = errors.New("ukuran video melebihi batas maksimal 25 MB")
	ErrInvalidExtension     = errors.New("ekstensi berkas tidak diizinkan. Hanya mendukung JPG, JPEG, PNG, WEBP, MP4, MOV, dan WEBM")
	ErrSuspiciousFilename   = errors.New("nama berkas mencurigakan atau mengandung ekstensi ganda (double extension)")
	ErrInvalidMagicBytes    = errors.New("signature biner berkas tidak cocok dengan format yang diizinkan (magic bytes mismatch)")
	ErrMaliciousContent     = errors.New("berkas terdeteksi mengandung indikasi skrip atau payload berbahaya (polyglot exploit)")
	ErrMimeExtensionMismatch = errors.New("ekstensi berkas tidak sesuai dengan tipe biner media yang terdeteksi")
)

type ValidatedMedia struct {
	MediaType string // "photo" atau "video"
	MimeType  string
	Extension string
	SizeBytes int64
}

// ValidateStrictMedia memvalidasi berkas secara mendalam dari segi ukuran, ekstensi, magic bytes, dan pemindaian anti-polyglot
func ValidateStrictMedia(filename string, data []byte) (*ValidatedMedia, error) {
	size := int64(len(data))
	if size < MinFileSizeBytes {
		return nil, ErrFileTooSmall
	}

	// 1. Validasi nama berkas dan anti double extension (e.g. payload.php.jpg)
	cleanName := filepath.Base(filepath.Clean(filename))
	if strings.Contains(cleanName, "\x00") {
		return nil, ErrSuspiciousFilename
	}

	parts := strings.Split(cleanName, ".")
	if len(parts) > 2 {
		// Periksa jika ada ekstensi tersembunyi berbahaya sebelum ekstensi terakhir
		for i := 1; i < len(parts)-1; i++ {
			partLower := strings.ToLower(parts[i])
			if partLower == "php" || partLower == "sh" || partLower == "bash" || partLower == "exe" ||
				partLower == "js" || partLower == "html" || partLower == "htm" || partLower == "py" ||
				partLower == "cgi" || partLower == "pl" || partLower == "phtml" {
				return nil, ErrSuspiciousFilename
			}
		}
	}

	ext := strings.ToLower(filepath.Ext(cleanName))
	if ext == "" {
		return nil, ErrInvalidExtension
	}

	// 2. Pemindaian Anti-Malware / Anti-Polyglot Exploitation
	// Memastikan berkas gambar/video tidak disisipi tag skrip HTML/PHP/JS atau binary executable
	if bytes.HasPrefix(data, []byte("MZ")) {
		return nil, ErrMaliciousContent // Windows executable
	}
	if bytes.HasPrefix(data, []byte("\x7fELF")) {
		return nil, ErrMaliciousContent // Linux ELF executable
	}

	lowerHeader := bytes.ToLower(data[:min(len(data), 1024)])
	dangerousSignatures := [][]byte{
		[]byte("<?php"),
		[]byte("<script"),
		[]byte("<!doctype html"),
		[]byte("<html"),
		[]byte("<svg"),
		[]byte("javascript:"),
		[]byte("eval("),
		[]byte("system("),
		[]byte("/bin/sh"),
		[]byte("/bin/bash"),
	}
	for _, sig := range dangerousSignatures {
		if bytes.Contains(lowerHeader, sig) {
			return nil, ErrMaliciousContent
		}
	}

	// 3. Inspeksi Magic Bytes & Format Identification
	var mediaType, mimeType, canonicalExt string

	switch {
	// JPEG: FF D8 FF
	case bytes.HasPrefix(data, []byte{0xFF, 0xD8, 0xFF}):
		mediaType = "photo"
		mimeType = "image/jpeg"
		canonicalExt = ".jpg"
		if ext != ".jpg" && ext != ".jpeg" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxPhotoSizeBytes {
			return nil, ErrPhotoTooLarge
		}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	case bytes.HasPrefix(data, []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}):
		mediaType = "photo"
		mimeType = "image/png"
		canonicalExt = ".png"
		if ext != ".png" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxPhotoSizeBytes {
			return nil, ErrPhotoTooLarge
		}

	// WebP: RIFF .... WEBP
	case len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		mediaType = "photo"
		mimeType = "image/webp"
		canonicalExt = ".webp"
		if ext != ".webp" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxPhotoSizeBytes {
			return nil, ErrPhotoTooLarge
		}

	// MP4: .... ftyp
	case len(data) >= 12 && string(data[4:8]) == "ftyp":
		mediaType = "video"
		mimeType = "video/mp4"
		canonicalExt = ".mp4"
		if ext != ".mp4" && ext != ".mov" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxVideoSizeBytes {
			return nil, ErrVideoTooLarge
		}

	// QuickTime (MOV): moov header atau ftypqt
	case (len(data) >= 8 && string(data[4:8]) == "moov") || (len(data) >= 12 && string(data[4:8]) == "ftyp" && string(data[8:12]) == "qt  "):
		mediaType = "video"
		mimeType = "video/quicktime"
		canonicalExt = ".mov"
		if ext != ".mov" && ext != ".mp4" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxVideoSizeBytes {
			return nil, ErrVideoTooLarge
		}

	// WebM: 1A 45 DF A3 (EBML Header)
	case bytes.HasPrefix(data, []byte{0x1A, 0x45, 0xDF, 0xA3}):
		mediaType = "video"
		mimeType = "video/webm"
		canonicalExt = ".webm"
		if ext != ".webm" {
			return nil, ErrMimeExtensionMismatch
		}
		if size > MaxVideoSizeBytes {
			return nil, ErrVideoTooLarge
		}

	default:
		return nil, fmt.Errorf("%w: ekstensi %s tidak sesuai dengan header biner berkas", ErrInvalidMagicBytes, ext)
	}

	return &ValidatedMedia{
		MediaType: mediaType,
		MimeType:  mimeType,
		Extension: canonicalExt,
		SizeBytes: size,
	}, nil
}
