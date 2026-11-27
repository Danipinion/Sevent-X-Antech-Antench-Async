package persistence

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/infrastructure/logger"
)

// AutoMigrate secara otomatis menjalankan semua file *.up.sql yang belum diterapkan
func AutoMigrate(ctx context.Context, pool *pgxpool.Pool) error {
	candidateDirs := []string{
		"/migrations",
		"database/migrations",
		"../../database/migrations",
		"../database/migrations",
	}

	var migrationDir string
	for _, dir := range candidateDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			migrationDir = dir
			break
		}
	}

	if migrationDir == "" {
		logger.Log.Warn("Direktori database/migrations tidak ditemukan, melewati auto-migration")
		return nil
	}

	// Buat tabel schema_migrations jika belum ada (kompatibel dengan format golang-migrate)
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version bigint PRIMARY KEY,
			dirty boolean NOT NULL DEFAULT false
		);
	`)
	if err != nil {
		return fmt.Errorf("gagal memastikan tabel schema_migrations: %w", err)
	}

	var currentVersion int64 = 0
	var dirty bool = false
	row := pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1;")
	if err := row.Scan(&currentVersion, &dirty); err != nil {
		currentVersion = 0
	}

	if dirty {
		logger.Log.Warn("Database dirty flag aktif pada schema_migrations", "version", currentVersion)
	}

	entries, err := os.ReadDir(migrationDir)
	if err != nil {
		return fmt.Errorf("gagal membaca direktori migrasi %s: %w", migrationDir, err)
	}

	type migrationFile struct {
		version  int64
		filename string
	}
	var upFiles []migrationFile

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}
		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}
		ver, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			continue
		}
		upFiles = append(upFiles, migrationFile{
			version:  ver,
			filename: entry.Name(),
		})
	}

	sort.Slice(upFiles, func(i, j int) bool {
		return upFiles[i].version < upFiles[j].version
	})

	appliedCount := 0
	for _, mf := range upFiles {
		if mf.version <= currentVersion {
			continue
		}

		filePath := filepath.Join(migrationDir, mf.filename)
		sqlContent, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("gagal membaca file migrasi %s: %w", mf.filename, err)
		}

		logger.Log.Info("Menerapkan migrasi database otomatis", "version", mf.version, "file", mf.filename)

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("gagal memulai transaksi migrasi %s: %w", mf.filename, err)
		}

		if _, err := tx.Exec(ctx, string(sqlContent)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("gagal eksekusi migrasi %s: %w", mf.filename, err)
		}

		// Update versi ke schema_migrations
		_, err = tx.Exec(ctx, `
			INSERT INTO schema_migrations (version, dirty)
			VALUES ($1, false)
			ON CONFLICT (version) DO UPDATE SET dirty = false;
		`, mf.version)
		if err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("gagal mencatat versi migrasi %d: %w", mf.version, err)
		}

		_, _ = tx.Exec(ctx, "DELETE FROM schema_migrations WHERE version < $1;", mf.version)

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("gagal commit migrasi %s: %w", mf.filename, err)
		}

		currentVersion = mf.version
		appliedCount++
	}

	if appliedCount > 0 {
		logger.Log.Info("Auto-migration database selesai diterapkan", "applied_count", appliedCount, "current_version", currentVersion)
	} else {
		logger.Log.Info("Struktur database PostgreSQL up to date", "version", currentVersion)
	}

	return nil
}
