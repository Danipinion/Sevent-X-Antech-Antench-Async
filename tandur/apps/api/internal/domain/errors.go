package domain

import "errors"

var (
	ErrNotFound           = errors.New("entitas tidak ditemukan")
	ErrInvalidInput       = errors.New("data masukan tidak valid")
	ErrUnauthorized       = errors.New("tidak memiliki otorisasi")
	ErrCommodityNotFound  = errors.New("komoditas tidak ditemukan")
	ErrInsufficientStock  = errors.New("stok komoditas tidak mencukupi")
	ErrUserNotFound       = errors.New("pengguna tidak ditemukan")
	ErrPhoneAlreadyExists = errors.New("nomor handphone sudah terdaftar")
	ErrNIKAlreadyExists   = errors.New("NIK sudah terdaftar")
	ErrInvalidRole        = errors.New("role tidak valid, pilih: farmer, middleman, atau buyer")
	ErrInvalidPhone       = errors.New("nomor handphone harus terdiri dari 10-13 digit")
	ErrInvalidNIK         = errors.New("NIK harus terdiri dari 16 digit angka")
	ErrPasswordTooShort   = errors.New("password minimal 6 karakter")
	ErrNameRequired       = errors.New("nama lengkap wajib diisi")
	ErrInvalidCoordinate  = errors.New("koordinat latitude (-90 s/d 90) atau longitude (-180 s/d 180) tidak valid")
)
