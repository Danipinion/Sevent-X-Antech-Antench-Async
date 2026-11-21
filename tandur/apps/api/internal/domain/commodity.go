package domain

import (
	"context"
	"time"
)

type QualityGrade string

const (
	GradeA QualityGrade = "GRADE_A"
	GradeB QualityGrade = "GRADE_B"
	GradeC QualityGrade = "GRADE_C"
)

type Commodity struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Category           string    `json:"category"`
	Unit               string    `json:"unit"`
	BasePrice          float64   `json:"base_price"`
	CurrentMarketPrice float64   `json:"current_market_price"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type CommodityRepository interface {
	GetAll(ctx context.Context) ([]Commodity, error)
	GetByID(ctx context.Context, id string) (*Commodity, error)
	Create(ctx context.Context, commodity *Commodity) error
	Update(ctx context.Context, commodity *Commodity) error
}

// SP2KPRegionPrice mendefinisikan rincian harga per region (Region A, B, C) untuk komoditas tertentu
type SP2KPRegionPrice struct {
	Region          string  `json:"region"`
	SatuanDisplay   string  `json:"satuan_display"`
	Harga           float64 `json:"harga"`
	HargaPembanding float64 `json:"harga_pembanding"`
	PersenPerubahan float64 `json:"persen_perubahan"`
	StatusPerubahan string  `json:"status_perubahan"`
}

// SP2KPCommodityPrice mendefinisikan hasil perbandingan harga komoditas dari API SP2KP Kemendag RI
type SP2KPCommodityPrice struct {
	VariantID         int                `json:"variant_id"`
	VariantNama       string             `json:"variant_nama"`
	SatuanDisplay     string             `json:"satuan_display"`
	Tanggal           string             `json:"tanggal"`
	Harga             float64            `json:"harga"`
	TanggalPembanding string             `json:"tanggal_pembanding"`
	HargaPembanding   float64            `json:"harga_pembanding"`
	DeltaHarga        float64            `json:"delta_harga"`
	PersenPerubahan   float64            `json:"persen_perubahan"`
	StatusPerubahan   string             `json:"status_perubahan"`
	IsRegional        bool               `json:"is_regional"`
	Region            []SP2KPRegionPrice `json:"region,omitempty"`
}

// MarketPriceQuery parameter pencarian harga pasar SP2KP Kemendag
type MarketPriceQuery struct {
	Tanggal           string `json:"tanggal" form:"tanggal" query:"tanggal"`
	TanggalPembanding string `json:"tanggal_pembanding" form:"tanggal_pembanding" query:"tanggal_pembanding"`
	KodeProvinsi      string `json:"kode_provinsi" form:"kode_provinsi" query:"kode_provinsi"`
	KodeKabKota       string `json:"kode_kab_kota" form:"kode_kab_kota" query:"kode_kab_kota"`
}

// MarketPriceProvider kontrak untuk client penyedia harga pasar komoditas eksternal
type MarketPriceProvider interface {
	GetCommodityPrices(ctx context.Context, query MarketPriceQuery) ([]SP2KPCommodityPrice, error)
}

// MarketPriceCache mendefinisikan kontrak penyimpanan cache harga pasar komoditas
type MarketPriceCache interface {
	GetMarketPrices(ctx context.Context, key string) ([]SP2KPCommodityPrice, bool)
	SetMarketPrices(ctx context.Context, key string, prices []SP2KPCommodityPrice, ttl time.Duration) error
}

// PriceTrend tren pergerakan harga komoditas (Naik, Turun, Stabil)
type PriceTrend string

const (
	TrendUp     PriceTrend = "UP"
	TrendDown   PriceTrend = "DOWN"
	TrendStable PriceTrend = "STABLE"
)

// DashboardCommodityPrice mendefinisikan struktur kartu pantauan harga pasar riil di dashboard petani
type DashboardCommodityPrice struct {
	CommodityID      string     `json:"commodity_id"`
	CommodityName    string     `json:"commodity_name"`
	Unit             string     `json:"unit"`
	AveragePrice     float64    `json:"average_price"`
	YesterdayPrice   float64    `json:"yesterday_price"`
	DeltaPrice       float64    `json:"delta_price"`
	PercentageChange float64    `json:"percentage_change"`
	Trend            PriceTrend `json:"trend"`
	TrendLabel       string     `json:"trend_label"`
	LastUpdatedAt    string     `json:"last_updated_at"`
	Source           string     `json:"source"`
}

// PriceGuide panduan kontrol batas margin harga saat petani menjual panen
type PriceGuide struct {
	CommodityName    string  `json:"commodity_name"`
	BenchmarkPrice   float64 `json:"benchmark_price"`
	AllowedMinPrice  float64 `json:"allowed_min_price"`
	AllowedMaxPrice  float64 `json:"allowed_max_price"`
	MarginPercentage float64 `json:"margin_percentage"`
	Unit             string  `json:"unit"`
	Source           string  `json:"source"`
	Message          string  `json:"message"`
}

// RealtimeMarketPriceCache cache khusus pantauan harga realtime (10 menit)
type RealtimeMarketPriceCache interface {
	GetRealtimePrices(ctx context.Context, key string) ([]DashboardCommodityPrice, bool)
	SetRealtimePrices(ctx context.Context, key string, prices []DashboardCommodityPrice, ttl time.Duration) error
}
