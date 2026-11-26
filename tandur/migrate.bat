@echo off
setlocal EnableDelayedExpansion

:: ==============================================================================
:: TANDUR - Script Pengelolaan Database Migration untuk Windows
:: Digunakan untuk menjalankan golang-migrate tanpa membutuhkan Makefile
:: ==============================================================================

title Tandur - Database Migration Manager

:: 1. Inisialisasi Nilai Default Konfigurasi
set "POSTGRES_USER=tandur"
set "POSTGRES_PASSWORD=change_me"
set "POSTGRES_DB=tandur"
set "POSTGRES_PORT=5435"
set "MIGRATIONS_DIR=database\migrations"

:: 2. Membaca konfigurasi dari file .env jika ada
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        if not "!KEY:~0,1!"=="#" (
            if "!KEY!"=="POSTGRES_USER" set "POSTGRES_USER=!VAL!"
            if "!KEY!"=="POSTGRES_PASSWORD" set "POSTGRES_PASSWORD=!VAL!"
            if "!KEY!"=="POSTGRES_DB" set "POSTGRES_DB=!VAL!"
            if "!KEY!"=="POSTGRES_PORT" set "POSTGRES_PORT=!VAL!"
        )
    )
)

set "DATABASE_URL=postgres://%POSTGRES_USER%:%POSTGRES_PASSWORD%@localhost:%POSTGRES_PORT%/%POSTGRES_DB%?sslmode=disable"
set "DOCKER_DB_URL=postgres://%POSTGRES_USER%:%POSTGRES_PASSWORD%@postgres:5432/%POSTGRES_DB%?sslmode=disable"

:: 3. Mendeteksi Tool Runner Migration (Lokal migrate.exe atau Docker)
set "RUNNER=docker"
set "MIGRATE_CMD="

where migrate >nul 2>nul
if %errorlevel% equ 0 (
    set "RUNNER=local"
    set "MIGRATE_CMD=migrate"
    goto :CHECK_ARGS
)

if exist "%USERPROFILE%\go\bin\migrate.exe" (
    set "RUNNER=local"
    set "MIGRATE_CMD=%USERPROFILE%\go\bin\migrate.exe"
    goto :CHECK_ARGS
)

:: Jika migrate.exe lokal tidak ada, cek apakah Docker tersedia
where docker >nul 2>nul
if %errorlevel% equ 0 (
    set "RUNNER=docker"
    goto :CHECK_ARGS
)

echo.
echo [ERROR] Tidak ditemukan migrate.exe maupun Docker di komputer Anda!
echo Silakan install salah satu dari:
echo  1. golang-migrate CLI (https://github.com/golang-migrate/migrate/releases)
echo  2. Docker Desktop for Windows
echo.
pause
exit /b 1

:CHECK_ARGS
:: 4. Cek Argumen Baris Perintah
set "ACTION=%~1"
set "PARAM=%~2"

if "%ACTION%"=="" goto :MENU
if /i "%ACTION%"=="help" goto :HELP
if /i "%ACTION%"=="-h" goto :HELP
if /i "%ACTION%"=="--help" goto :HELP
if /i "%ACTION%"=="up" goto :DO_UP
if /i "%ACTION%"=="db-up" goto :DO_UP
if /i "%ACTION%"=="migrate-up" goto :DO_UP
if /i "%ACTION%"=="down" goto :DO_DOWN
if /i "%ACTION%"=="db-down" goto :DO_DOWN
if /i "%ACTION%"=="migrate-down" goto :DO_DOWN
if /i "%ACTION%"=="version" goto :DO_VERSION
if /i "%ACTION%"=="db-version" goto :DO_VERSION
if /i "%ACTION%"=="force" goto :DO_FORCE
if /i "%ACTION%"=="db-force" goto :DO_FORCE
if /i "%ACTION%"=="create" goto :DO_CREATE
if /i "%ACTION%"=="seed" goto :DO_SEED
if /i "%ACTION%"=="db-seed" goto :DO_SEED
if /i "%ACTION%"=="reset" goto :DO_RESET
if /i "%ACTION%"=="db-reset" goto :DO_RESET

echo.
echo [ERROR] Perintah '%ACTION%' tidak dikenali.
echo Ketik 'migrate.bat help' untuk melihat daftar perintah.
echo.
exit /b 1

:: ==============================================================================
:: SUBROUTINES & LOGIC EXECUTION
:: ==============================================================================

:EXEC_MIGRATE
:: Parameter %* akan diteruskan ke command migrate
if "%RUNNER%"=="local" (
    echo [INFO] Menjalankan via migrate.exe lokal:
    echo        Database: postgres://%POSTGRES_USER%:***@localhost:%POSTGRES_PORT%/%POSTGRES_DB%
    "%MIGRATE_CMD%" -path database/migrations -database "%DATABASE_URL%" %*
) else (
    echo [INFO] Menjalankan via Docker container (migrate/migrate):
    echo        Network: tandur_tandur-network
    docker run --rm -v "%cd%/database/migrations:/migrations" --network tandur_tandur-network migrate/migrate -path=/migrations -database "%DOCKER_DB_URL%" %*
)
goto :eof

:DO_UP
echo.
echo ==============================================================
echo [INFO] Menjalankan seluruh database migration (UP)...
echo ==============================================================
call :EXEC_MIGRATE up
if %errorlevel% equ 0 (
    echo [SUKSES] Seluruh migrasi database berhasil diterapkan.
) else (
    echo [GAGAL] Terjadi kesalahan saat migrasi up.
)
goto :END

:DO_DOWN
set "STEPS=%PARAM%"
if "%STEPS%"=="" set "STEPS=1"
echo.
echo ==============================================================
echo [INFO] Melakukan rollback database migration (%STEPS% langkah DOWN)...
echo ==============================================================
call :EXEC_MIGRATE down %STEPS%
if %errorlevel% equ 0 (
    echo [SUKSES] Rollback migrasi database berhasil diselesaikan.
) else (
    echo [GAGAL] Terjadi kesalahan saat rollback migrasi down.
)
goto :END

:DO_VERSION
echo.
echo ==============================================================
echo [INFO] Memeriksa versi database migration saat ini...
echo ==============================================================
call :EXEC_MIGRATE version
goto :END

:DO_FORCE
set "TARGET_VER=%PARAM%"
if "%TARGET_VER%"=="" (
    echo.
    set /p "TARGET_VER=Masukkan nomor versi target force (misal 20): "
)
if "%TARGET_VER%"=="" (
    echo [ERROR] Versi target force tidak boleh kosong.
    goto :END
)
echo.
echo ==============================================================
echo [INFO] Menjalankan force migration ke versi %TARGET_VER%...
echo ==============================================================
call :EXEC_MIGRATE force %TARGET_VER%
if %errorlevel% equ 0 (
    echo [SUKSES] Database migration status berhasil di-force ke versi %TARGET_VER%.
) else (
    echo [GAGAL] Gagal melakukan force migration.
)
goto :END

:DO_CREATE
set "NAME=%PARAM%"
if "%NAME%"=="" (
    echo.
    set /p "NAME=Masukkan nama deskripsi migrasi baru (misal: tambah_tabel_promo): "
)
if "%NAME%"=="" (
    echo [ERROR] Nama migrasi tidak boleh kosong.
    goto :END
)

:: Hitung nomor urut migrasi berikutnya berdasarkan file yang ada
set /a MAX_VER=0
for /f "tokens=1 delims=_" %%F in ('dir /b /on "%~dp0database\migrations\*_*.up.sql" 2^>nul') do (
    set "NUM=%%F"
    :: Hilangkan leading zeros untuk operasi aritmatika
    for /f "tokens=* delims=0" %%N in ("!NUM!") do set "CLEAN_NUM=%%N"
    if "!CLEAN_NUM!"=="" set "CLEAN_NUM=0"
    if !CLEAN_NUM! gtr !MAX_VER! set /a MAX_VER=!CLEAN_NUM!
)

set /a NEXT_VER=MAX_VER + 1
set "PADDED_VER=000000!NEXT_VER!"
set "PREFIX=!PADDED_VER:~-6!"

set "UP_FILE=%~dp0database\migrations\!PREFIX!_%NAME%.up.sql"
set "DOWN_FILE=%~dp0database\migrations\!PREFIX!_%NAME%.down.sql"

echo -- Migration !PREFIX!: %NAME% (UP) > "!UP_FILE!"
echo -- Tulis perintah SQL DDL/DML di bawah ini: >> "!UP_FILE!"
echo. >> "!UP_FILE!"

echo -- Migration !PREFIX!: %NAME% (DOWN) > "!DOWN_FILE!"
echo -- Tulis perintah rollback SQL di bawah ini: >> "!DOWN_FILE!"
echo. >> "!DOWN_FILE!"

echo.
echo ==============================================================
echo [SUKSES] Sepasang file migrasi baru berhasil dibuat:
echo 1. database\migrations\!PREFIX!_%NAME%.up.sql
echo 2. database\migrations\!PREFIX!_%NAME%.down.sql
echo ==============================================================
goto :END

:DO_SEED
echo.
echo ==============================================================
echo [INFO] Memasukkan data awal (seed) ke PostgreSQL...
echo ==============================================================
docker exec -i tandur-postgres psql -U %POSTGRES_USER% -d %POSTGRES_DB% < "%~dp0database\seeds\001_roles.sql"
docker exec -i tandur-postgres psql -U %POSTGRES_USER% -d %POSTGRES_DB% < "%~dp0database\seeds\002_commodities.sql"
if %errorlevel% equ 0 (
    echo [SUKSES] Seed data berhasil dimasukkan ke database.
) else (
    echo [PERINGATAN] Gagal seeding langsung via psql. Mencoba via docker compose exec...
    docker compose exec -T postgres psql -U %POSTGRES_USER% -d %POSTGRES_DB% < "%~dp0database\seeds\001_roles.sql"
    docker compose exec -T postgres psql -U %POSTGRES_USER% -d %POSTGRES_DB% < "%~dp0database\seeds\002_commodities.sql"
)
goto :END

:DO_RESET
echo.
echo ==============================================================
echo [PERINGATAN] PERHATIAN! Tindakan ini akan MENGHAPUS SEMUA DATA
echo database PostgreSQL lokal Tandur dan mengulangnya dari awal.
echo ==============================================================
set /p "CONFIRM=Apakah Anda yakin ingin mereset database? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo [INFO] Reset database dibatalkan.
    goto :END
)
echo [INFO] Mereset container dan volume postgres...
docker compose down -v
docker compose up -d postgres
echo [INFO] Menunggu PostgreSQL siap...
timeout /t 5 /nobreak >nul
goto :DO_UP

:HELP
echo.
echo ==============================================================================
echo             TANDUR - PANDUAN PENGGUNAAN DATABASE MIGRATION (WINDOWS)
echo ==============================================================================
echo.
echo  Penggunaan:
echo    migrate.bat [perintah] [parameter opsional]
echo.
echo  Daftar Perintah:
echo    migrate.bat up             Menjalankan seluruh file migrasi ke versi terbaru
echo    migrate.bat down [N]       Rollback migrasi (default: 1 versi terakhir, atau N versi)
echo    migrate.bat version        Melihat nomor versi migrasi database aktif saat ini
echo    migrate.bat force ^<VER^>    Memperbaiki status dirty database ke nomor versi tertentu
echo    migrate.bat create ^<NAMA^>  Membuat sepasang file migrasi baru (.up.sql dan .down.sql)
echo    migrate.bat seed           Memasukkan data seed awal (roles dan commodities)
echo    migrate.bat reset          Menghapus volume database & migrasi ulang dari awal
echo    migrate.bat help           Menampilkan panduan ini
echo.
echo  Contoh Penggunaan:
echo    migrate.bat up
echo    migrate.bat down 1
echo    migrate.bat force 20
echo    migrate.bat create tambah_fitur_tengkulak
echo    migrate.bat seed
echo.
echo  Catatan:
echo    Jika dijalankan tanpa parameter (double-click migrate.bat), menu interaktif
echo    akan otomatis terbuka sehingga Anda tinggal memilih nomor menu.
echo.
goto :END

:MENU
cls
echo ==============================================================================
echo               TANDUR - PENGELOLAAN DATABASE MIGRATION (WINDOWS)
echo ==============================================================================
echo  Runner aktif : %RUNNER%
if "%RUNNER%"=="local" (
    echo  Binary path  : %MIGRATE_CMD%
) else (
    echo  Docker image : migrate/migrate:latest
)
echo  Database URL : postgres://%POSTGRES_USER%:***@localhost:%POSTGRES_PORT%/%POSTGRES_DB%
echo ==============================================================================
echo.
echo   [1] Jalankan Semua Migrasi Terbaru (UP)
echo   [2] Rollback 1 Versi Migrasi Terakhir (DOWN)
echo   [3] Cek Versi Migrasi Database Saat Ini (VERSION)
echo   [4] Perbaiki Status Dirty / Force Versi (FORCE)
echo   [5] Buat File Migrasi Baru (CREATE)
echo   [6] Masukkan Data Awal / Seed (SEED)
echo   [7] Reset Database Development (RESET)
echo   [8] Panduan Perintah (HELP)
echo   [0] Keluar
echo.
echo ==============================================================================
set /p "CHOICE=Pilih nomor menu [0-8]: "

if "%CHOICE%"=="1" (call :DO_UP & pause & goto :MENU)
if "%CHOICE%"=="2" (call :DO_DOWN & pause & goto :MENU)
if "%CHOICE%"=="3" (call :DO_VERSION & pause & goto :MENU)
if "%CHOICE%"=="4" (call :DO_FORCE & pause & goto :MENU)
if "%CHOICE%"=="5" (call :DO_CREATE & pause & goto :MENU)
if "%CHOICE%"=="6" (call :DO_SEED & pause & goto :MENU)
if "%CHOICE%"=="7" (call :DO_RESET & pause & goto :MENU)
if "%CHOICE%"=="8" (call :HELP & pause & goto :MENU)
if "%CHOICE%"=="0" exit /b 0

echo [ERROR] Pilihan tidak valid.
timeout /t 2 /nobreak >nul
goto :MENU

:END
exit /b 0
