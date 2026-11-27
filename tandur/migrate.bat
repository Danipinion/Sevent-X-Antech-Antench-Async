
@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ==============================================================================
:: TANDUR - DATABASE MIGRATION MANAGER
:: Windows Batch Script
:: ==============================================================================

title Tandur - Database Migration Manager

:: ==============================================================================
:: 1. DEFAULT CONFIGURATION
:: ==============================================================================

set "POSTGRES_USER=tandur"
set "POSTGRES_PASSWORD=change_me"
set "POSTGRES_DB=tandur"
set "POSTGRES_PORT=5435"
set "MIGRATIONS_DIR=%~dp0database\migrations"
set "SEEDS_DIR=%~dp0database\seeds"

:: ==============================================================================
:: 2. LOAD .ENV
:: ==============================================================================

if exist "%~dp0.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env") do (
        if "%%A"=="POSTGRES_USER" set "POSTGRES_USER=%%B"
        if "%%A"=="POSTGRES_PASSWORD" set "POSTGRES_PASSWORD=%%B"
        if "%%A"=="POSTGRES_DB" set "POSTGRES_DB=%%B"
        if "%%A"=="POSTGRES_PORT" set "POSTGRES_PORT=%%B"
    )
)

:: ==============================================================================
:: 3. DATABASE URL
:: ==============================================================================

set "DATABASE_URL=postgres://%POSTGRES_USER%:%POSTGRES_PASSWORD%@localhost:%POSTGRES_PORT%/%POSTGRES_DB%?sslmode=disable"
set "DOCKER_DB_URL=postgres://%POSTGRES_USER%:%POSTGRES_PASSWORD%@postgres:5432/%POSTGRES_DB%?sslmode=disable"

:: ==============================================================================
:: 4. CHECK MIGRATION RUNNER
:: ==============================================================================

set "RUNNER="
set "MIGRATE_CMD="

where migrate.exe >nul 2>nul

if not errorlevel 1 (
    set "RUNNER=local"
    set "MIGRATE_CMD=migrate.exe"
    goto CHECK_ARGS
)

if exist "%USERPROFILE%\go\bin\migrate.exe" (
    set "RUNNER=local"
    set "MIGRATE_CMD=%USERPROFILE%\go\bin\migrate.exe"
    goto CHECK_ARGS
)

where docker.exe >nul 2>nul

if not errorlevel 1 (
    set "RUNNER=docker"
    goto CHECK_ARGS
)

echo.
echo [ERROR] migrate.exe maupun Docker tidak ditemukan!
echo.
echo Install salah satu:
echo 1. golang-migrate CLI
echo    https://github.com/golang-migrate/migrate/releases
echo.
echo 2. Docker Desktop
echo.
pause
exit /b 1

:: ==============================================================================
:: 5. CHECK ARGUMENTS
:: ==============================================================================

:CHECK_ARGS

set "ACTION=%~1"
set "PARAM=%~2"

if not defined ACTION goto MENU

if /i "%ACTION%"=="help" goto HELP
if /i "%ACTION%"=="-h" goto HELP
if /i "%ACTION%"=="--help" goto HELP

if /i "%ACTION%"=="up" goto DO_UP
if /i "%ACTION%"=="db-up" goto DO_UP
if /i "%ACTION%"=="migrate-up" goto DO_UP

if /i "%ACTION%"=="down" goto DO_DOWN
if /i "%ACTION%"=="db-down" goto DO_DOWN
if /i "%ACTION%"=="migrate-down" goto DO_DOWN

if /i "%ACTION%"=="version" goto DO_VERSION
if /i "%ACTION%"=="db-version" goto DO_VERSION

if /i "%ACTION%"=="force" goto DO_FORCE
if /i "%ACTION%"=="db-force" goto DO_FORCE

if /i "%ACTION%"=="create" goto DO_CREATE

if /i "%ACTION%"=="seed" goto DO_SEED
if /i "%ACTION%"=="db-seed" goto DO_SEED

if /i "%ACTION%"=="reset" goto DO_RESET
if /i "%ACTION%"=="db-reset" goto DO_RESET

echo.
echo [ERROR] Perintah "%ACTION%" tidak dikenali.
echo Ketik migrate.bat help untuk melihat bantuan.
echo.
exit /b 1

:: ==============================================================================
:: 6. MIGRATION EXECUTOR
:: ==============================================================================

:EXEC_MIGRATE

if /i "%RUNNER%"=="local" (
    echo [INFO] Migration menggunakan CLI lokal.
    echo.

    "%MIGRATE_CMD%" -path "%MIGRATIONS_DIR%" -database "%DATABASE_URL%" %*
    exit /b !errorlevel!
)

if /i "%RUNNER%"=="docker" (
    echo [INFO] Migration menggunakan Docker.
    echo.

    docker run --rm ^
        -v "%MIGRATIONS_DIR%:/migrations" ^
        --network tandur_tandur-network ^
        migrate/migrate ^
        -path=/migrations ^
        -database "%DOCKER_DB_URL%" %*

    exit /b !errorlevel!
)

echo [ERROR] Migration runner tidak valid.
exit /b 1

:: ==============================================================================
:: 7. MIGRATION UP
:: ==============================================================================

:DO_UP

echo.
echo ==============================================================
echo [INFO] Menjalankan database migration UP...
echo ==============================================================

call :EXEC_MIGRATE up

if errorlevel 1 (
    echo.
    echo [GAGAL] Migration UP gagal.
) else (
    echo.
    echo [SUKSES] Seluruh migration berhasil diterapkan.
)

goto END

:: ==============================================================================
:: 8. MIGRATION DOWN
:: ==============================================================================

:DO_DOWN

set "STEPS=%PARAM%"

if not defined STEPS set "STEPS=1"

echo.
echo ==============================================================
echo [INFO] Rollback migration sebanyak %STEPS% versi...
echo ==============================================================

call :EXEC_MIGRATE down %STEPS%

if errorlevel 1 (
    echo.
    echo [GAGAL] Rollback migration gagal.
) else (
    echo.
    echo [SUKSES] Rollback berhasil.
)

goto END

:: ==============================================================================
:: 9. MIGRATION VERSION
:: ==============================================================================

:DO_VERSION

echo.
echo ==============================================================
echo [INFO] Memeriksa migration version...
echo ==============================================================

call :EXEC_MIGRATE version

goto END

:: ==============================================================================
:: 10. MIGRATION FORCE
:: ==============================================================================

:DO_FORCE

set "TARGET_VER=%PARAM%"

if not defined TARGET_VER (
    echo.
    set /p "TARGET_VER=Masukkan target migration version: "
)

if not defined TARGET_VER (
    echo [ERROR] Target version tidak boleh kosong.
    goto END
)

echo.
echo ==============================================================
echo [INFO] Force migration ke versi %TARGET_VER%...
echo ==============================================================

call :EXEC_MIGRATE force %TARGET_VER%

if errorlevel 1 (
    echo [GAGAL] Force migration gagal.
) else (
    echo [SUKSES] Migration version berhasil diubah.
)

goto END

:: ==============================================================================
:: 11. CREATE MIGRATION
:: ==============================================================================

:DO_CREATE

set "NAME=%PARAM%"

if not defined NAME (
    echo.
    set /p "NAME=Masukkan nama migration: "
)

if not defined NAME (
    echo [ERROR] Nama migration tidak boleh kosong.
    goto END
)

:: Validasi nama file sederhana
echo(%NAME%| findstr /r "[^a-zA-Z0-9_-]" >nul

if not errorlevel 1 (
    echo [ERROR] Nama hanya boleh mengandung huruf, angka, underscore, dan dash.
    goto END
)

if not exist "%MIGRATIONS_DIR%" (
    mkdir "%MIGRATIONS_DIR%"
)

:: Hitung versi migration terbesar
set /a MAX_VER=0

for /f "tokens=1 delims=_" %%F in ('dir /b /a-d "%MIGRATIONS_DIR%\*_*.up.sql" 2^>nul') do (
    set "NUM=%%F"

    set /a CURRENT_VER=1!NUM! - 1000000

    if !CURRENT_VER! gtr !MAX_VER! (
        set /a MAX_VER=CURRENT_VER
    )
)

set /a NEXT_VER=MAX_VER+1

set "PADDED_VER=000000!NEXT_VER!"
set "PREFIX=!PADDED_VER:~-6!"

set "UP_FILE=%MIGRATIONS_DIR%\!PREFIX!_%NAME%.up.sql"
set "DOWN_FILE=%MIGRATIONS_DIR%\!PREFIX!_%NAME%.down.sql"

if exist "!UP_FILE!" (
    echo [ERROR] File migration sudah ada.
    goto END
)

if exist "!DOWN_FILE!" (
    echo [ERROR] File rollback sudah ada.
    goto END
)

(
    echo -- Migration !PREFIX!: %NAME% UP
    echo.
    echo -- Tulis SQL migration di bawah ini.
) > "!UP_FILE!"

(
    echo -- Migration !PREFIX!: %NAME% DOWN
    echo.
    echo -- Tulis SQL rollback di bawah ini.
) > "!DOWN_FILE!"

echo.
echo ==============================================================
echo [SUKSES] Migration berhasil dibuat!
echo.
echo UP:
echo !UP_FILE!
echo.
echo DOWN:
echo !DOWN_FILE!
echo ==============================================================

goto END

:: ==============================================================================
:: 12. DATABASE SEED
:: ==============================================================================

:DO_SEED

echo.
echo ==============================================================
echo [INFO] Menjalankan database seed...
echo ==============================================================

set "SEED_FAILED=0"

if not exist "%SEEDS_DIR%\001_roles.sql" (
    echo [ERROR] File 001_roles.sql tidak ditemukan.
    set "SEED_FAILED=1"
)

if not exist "%SEEDS_DIR%\002_commodities.sql" (
    echo [ERROR] File 002_commodities.sql tidak ditemukan.
    set "SEED_FAILED=1"
)

if "!SEED_FAILED!"=="1" goto SEED_FAILED

docker exec -i tandur-postgres psql -v ON_ERROR_STOP=1 -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" < "%SEEDS_DIR%\001_roles.sql"

if errorlevel 1 (
    echo [WARNING] Seed via docker exec gagal. Mencoba Docker Compose...
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" < "%SEEDS_DIR%\001_roles.sql"

    if errorlevel 1 set "SEED_FAILED=1"
)

docker exec -i tandur-postgres psql -v ON_ERROR_STOP=1 -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" < "%SEEDS_DIR%\002_commodities.sql"

if errorlevel 1 (
    echo [WARNING] Seed via docker exec gagal. Mencoba Docker Compose...
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" < "%SEEDS_DIR%\002_commodities.sql"

    if errorlevel 1 set "SEED_FAILED=1"
)

if "!SEED_FAILED!"=="1" goto SEED_FAILED

echo.
echo [SUKSES] Database seed berhasil dijalankan.
goto END

:SEED_FAILED

echo.
echo [GAGAL] Terdapat seed yang gagal dijalankan.
goto END

:: ==============================================================================
:: 13. DATABASE RESET
:: ==============================================================================

:DO_RESET

echo.
echo ==============================================================
echo [PERINGATAN] DATABASE RESET
echo.
echo Seluruh data PostgreSQL dan volume database akan dihapus!
echo Tindakan ini tidak dapat dibatalkan.
echo ==============================================================

set "CONFIRM="

set /p "CONFIRM=Apakah Anda yakin? Ketik Y untuk melanjutkan: "

if /i not "!CONFIRM!"=="Y" (
    echo.
    echo [INFO] Reset dibatalkan.
    goto END
)

echo.
echo [INFO] Menghentikan container dan menghapus volume...

docker compose down -v

if errorlevel 1 (
    echo [ERROR] Gagal menghentikan Docker Compose.
    goto END
)

echo.
echo [INFO] Menjalankan PostgreSQL...

docker compose up -d postgres

if errorlevel 1 (
    echo [ERROR] Gagal menjalankan PostgreSQL.
    goto END
)

echo.
echo [INFO] Menunggu PostgreSQL siap...

set /a WAIT_COUNT=0

:WAIT_POSTGRES

docker exec tandur-postgres pg_isready -U "%POSTGRES_USER%" -d "%POSTGRES_DB%" >nul 2>nul

if not errorlevel 1 goto POSTGRES_READY

set /a WAIT_COUNT+=1

if !WAIT_COUNT! geq 30 (
    echo.
    echo [ERROR] PostgreSQL tidak siap setelah 30 percobaan.
    goto END
)

timeout /t 2 /nobreak >nul
goto WAIT_POSTGRES

:POSTGRES_READY

echo.
echo [SUKSES] PostgreSQL sudah siap.
echo.
echo [INFO] Menjalankan migration UP...

call :EXEC_MIGRATE up

if errorlevel 1 (
    echo [GAGAL] Migration setelah reset gagal.
    goto END
)

echo.
echo [SUKSES] Database berhasil di-reset dan dimigrasikan.
goto END

:: ==============================================================================
:: 14. HELP
:: ==============================================================================

:HELP

echo.
echo ==============================================================
echo TANDUR - DATABASE MIGRATION MANAGER
echo ==============================================================
echo.
echo Penggunaan:
echo migrate.bat [command] [parameter]
echo.
echo COMMAND:
echo.
echo migrate.bat up
echo   Menjalankan seluruh migration.
echo.
echo migrate.bat down [N]
echo   Rollback migration. Default 1 versi.
echo.
echo migrate.bat version
echo   Melihat versi database.
echo.
echo migrate.bat force [VERSION]
echo   Mengubah status migration secara paksa.
echo.
echo migrate.bat create [NAME]
echo   Membuat file migration UP dan DOWN.
echo.
echo migrate.bat seed
echo   Memasukkan data awal.
echo.
echo migrate.bat reset
echo   Menghapus volume dan membuat ulang database.
echo.
echo migrate.bat help
echo   Menampilkan panduan.
echo.
echo CONTOH:
echo.
echo migrate.bat up
echo migrate.bat down 1
echo migrate.bat force 20
echo migrate.bat create tambah_tabel_promo
echo migrate.bat seed
echo migrate.bat reset
echo.
echo ==============================================================

goto END

:: ==============================================================================
:: 15. INTERACTIVE MENU
:: ==============================================================================

:MENU

cls

echo.
echo ==============================================================
echo       TANDUR - DATABASE MIGRATION MANAGER
echo ==============================================================
echo.
echo Runner aktif : %RUNNER%

if /i "%RUNNER%"=="local" (
    echo Binary       : %MIGRATE_CMD%
) else (
    echo Docker image : migrate/migrate
)

echo Database     : %POSTGRES_DB%
echo Host         : localhost:%POSTGRES_PORT%
echo User         : %POSTGRES_USER%
echo.
echo ==============================================================
echo.
echo [1] Jalankan Semua Migration (UP)
echo [2] Rollback Migration (DOWN)
echo [3] Cek Migration Version
echo [4] Force Migration Version
echo [5] Buat Migration Baru
echo [6] Database Seed
echo [7] Reset Database Development
echo [8] Panduan Penggunaan
echo [0] Keluar
echo.
echo ==============================================================

set "CHOICE="

set /p "CHOICE=Pilih menu [0-8]: "

if "!CHOICE!"=="1" goto MENU_UP
if "!CHOICE!"=="2" goto MENU_DOWN
if "!CHOICE!"=="3" goto MENU_VERSION
if "!CHOICE!"=="4" goto MENU_FORCE
if "!CHOICE!"=="5" goto MENU_CREATE
if "!CHOICE!"=="6" goto MENU_SEED
if "!CHOICE!"=="7" goto MENU_RESET
if "!CHOICE!"=="8" goto MENU_HELP
if "!CHOICE!"=="0" goto EXIT_SCRIPT

echo.
echo [ERROR] Pilihan tidak valid.
timeout /t 2 /nobreak >nul
goto MENU

:: ==============================================================================
:: MENU HANDLERS
:: ==============================================================================

:MENU_UP

call :DO_UP
pause
goto MENU

:MENU_DOWN

call :DO_DOWN
pause
goto MENU

:MENU_VERSION

call :DO_VERSION
pause
goto MENU

:MENU_FORCE

call :DO_FORCE
pause
goto MENU

:MENU_CREATE

call :DO_CREATE
pause
goto MENU

:MENU_SEED

call :DO_SEED
pause
goto MENU

:MENU_RESET

call :DO_RESET
pause
goto MENU

:MENU_HELP

call :HELP
pause
goto MENU

:: ==============================================================================
:: EXIT
:: ==============================================================================

:EXIT_SCRIPT

echo.
echo [INFO] Keluar dari Tandur Migration Manager.
exit /b 0

:END

exit /b 0
