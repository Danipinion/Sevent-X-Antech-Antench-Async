package external

import (
	"context"
	"time"

	"tandur/api/internal/infrastructure/config"
)

type MarketPriceReference struct {
	CommodityName string    `json:"commodity_name"`
	Region        string    `json:"region"`
	AveragePrice  float64   `json:"average_price"`
	RecordedAt    time.Time `json:"recorded_at"`
}

type MarketPriceClient struct {
	baseURL string
}

func NewMarketPriceClient(cfg *config.Config) *MarketPriceClient {
	return &MarketPriceClient{baseURL: cfg.MarketPriceURL}
}

func (c *MarketPriceClient) FetchLatestPrices(ctx context.Context) ([]MarketPriceReference, error) {
	// Integration with Badan Pangan Nasional / PIHPS reference API
	return []MarketPriceReference{
		{CommodityName: "Cabai Merah Keriting", Region: "Jawa Barat", AveragePrice: 45000, RecordedAt: time.Now()},
		{CommodityName: "Bawang Merah", Region: "Jawa Tengah", AveragePrice: 36000, RecordedAt: time.Now()},
	}, nil
}
