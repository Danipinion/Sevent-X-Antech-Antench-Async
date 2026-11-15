package domain

import "errors"

var (
	ErrNotFound          = errors.New("entitas tidak ditemukan")
	ErrInvalidInput      = errors.New("data masukan tidak valid")
	ErrUnauthorized      = errors.New("tidak memiliki otorisasi")
	ErrCommodityNotFound = errors.New("komoditas tidak ditemukan")
	ErrInsufficientStock = errors.New("stok komoditas tidak mencukupi")
)
