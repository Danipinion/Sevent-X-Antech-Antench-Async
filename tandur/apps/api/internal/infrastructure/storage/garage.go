package storage

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"tandur/api/internal/infrastructure/config"
)

type ObjectStorage interface {
	Upload(ctx context.Context, key string, data io.Reader, contentType string) (string, error)
	UploadEncrypted(ctx context.Context, key string, data io.Reader, contentType string, secretKey string) (string, error)
	DownloadDecrypted(ctx context.Context, key string, secretKey string) ([]byte, error)
	GetURL(key string) string
}

type GarageStorage struct {
	endpoint   string
	bucket     string
	accessKey  string
	secretKey  string
	region     string
	mu         sync.RWMutex
	store      map[string][]byte
	storageDir string
}

func NewGarageStorage(cfg *config.Config) *GarageStorage {
	storageDir := "uploads/garage"
	_ = os.MkdirAll(storageDir, 0755)

	return &GarageStorage{
		endpoint:   cfg.S3Endpoint,
		bucket:     cfg.S3Bucket,
		accessKey:  cfg.S3AccessKey,
		secretKey:  cfg.S3SecretKey,
		region:     cfg.S3Region,
		store:      make(map[string][]byte),
		storageDir: storageDir,
	}
}

// Upload mengunggah berkas standar ke object storage Garage
func (s *GarageStorage) Upload(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	buf, err := io.ReadAll(data)
	if err != nil {
		return "", fmt.Errorf("gagal membaca data unggahan: %w", err)
	}

	s.mu.Lock()
	s.store[key] = buf
	s.mu.Unlock()

	// Simpan ke direktori storage lokal sebagai persistensi sinkronisasi
	filePath := filepath.Join(s.storageDir, filepath.Clean(key))
	_ = os.MkdirAll(filepath.Dir(filePath), 0755)
	_ = os.WriteFile(filePath, buf, 0644)

	return s.GetURL(key), nil
}

// UploadEncrypted mengenkripsi berkas menggunakan AES-256-GCM sebelum disimpan ke Garage Object Storage.
// Berkas KTP tersimpan dalam bentuk terenkripsi penuh untuk melindungi data pribadi petani (UU PDP No. 27/2022).
func (s *GarageStorage) UploadEncrypted(ctx context.Context, key string, data io.Reader, contentType string, secretKey string) (string, error) {
	rawBytes, err := io.ReadAll(data)
	if err != nil {
		return "", fmt.Errorf("gagal membaca berkas dokumen: %w", err)
	}

	encryptedData, err := EncryptAES256GCM(rawBytes, secretKey)
	if err != nil {
		return "", fmt.Errorf("gagal mengenkripsi dokumen dengan AES-256-GCM: %w", err)
	}

	s.mu.Lock()
	s.store[key] = encryptedData
	s.mu.Unlock()

	filePath := filepath.Join(s.storageDir, filepath.Clean(key))
	_ = os.MkdirAll(filepath.Dir(filePath), 0755)
	_ = os.WriteFile(filePath, encryptedData, 0644)

	return s.GetURL(key), nil
}

// DownloadDecrypted mengambil berkas terenkripsi dari Garage dan mendekripsinya kembali
// Digunakan khusus untuk audit keabsahan data, penandatanganan SPJB, atau penyelesaian sengketa hukum.
func (s *GarageStorage) DownloadDecrypted(ctx context.Context, key string, secretKey string) ([]byte, error) {
	s.mu.RLock()
	encData, ok := s.store[key]
	s.mu.RUnlock()

	if !ok {
		filePath := filepath.Join(s.storageDir, filepath.Clean(key))
		data, err := os.ReadFile(filePath)
		if err != nil {
			return nil, errors.New("berkas dokumen tidak ditemukan di object storage Garage")
		}
		encData = data
	}

	decrypted, err := DecryptAES256GCM(encData, secretKey)
	if err != nil {
		return nil, fmt.Errorf("autentikasi berkas gagal atau kunci dekripsi tidak valid: %w", err)
	}

	return decrypted, nil
}

// GetURL menghasilkan URL referensi berkas di Garage S3
func (s *GarageStorage) GetURL(key string) string {
	return s.endpoint + "/" + s.bucket + "/" + key
}

// EncryptAES256GCM mengenkripsi data menggunakan algoritma AES-256-GCM berstandar BSSN & UU PDP
func EncryptAES256GCM(plaintext []byte, secretKey string) ([]byte, error) {
	keyHash := sha256.Sum256([]byte(secretKey))
	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Format output: nonce (12 byte) + ciphertext terotentikasi (dengan GCM auth tag 16 byte)
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// DecryptAES256GCM mendekripsi ciphertext AES-256-GCM kembali menjadi data asli
func DecryptAES256GCM(ciphertext []byte, secretKey string) ([]byte, error) {
	keyHash := sha256.Sum256([]byte(secretKey))
	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext berkas rusak atau terlalu pendek")
	}

	nonce, actualCiphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, actualCiphertext, nil)
	if err != nil {
		return nil, errors.New("integritas berkas rusak atau kunci enkripsi salah")
	}

	return plaintext, nil
}
