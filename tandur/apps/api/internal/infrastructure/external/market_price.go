package external

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
)

type MarketPriceClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewMarketPriceClient(cfg *config.Config) *MarketPriceClient {
	baseURL := cfg.MarketPriceURL
	if baseURL == "" {
		baseURL = "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga"
	}

	return &MarketPriceClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func NewMarketPriceClientWithHTTP(baseURL string, httpClient *http.Client) *MarketPriceClient {
	if baseURL == "" {
		baseURL = "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga"
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &MarketPriceClient{
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

type sp2kpAPIResponse struct {
	Status  string                       `json:"status"`
	Message string                       `json:"message"`
	Data    []domain.SP2KPCommodityPrice `json:"data"`
}

// GetCommodityPrices memanggil endpoint SP2KP Kemendag RI untuk mendapatkan data perbandingan harga komoditas
func (c *MarketPriceClient) GetCommodityPrices(ctx context.Context, query domain.MarketPriceQuery) ([]domain.SP2KPCommodityPrice, error) {
	form := url.Values{}
	if query.Tanggal != "" {
		form.Set("tanggal", query.Tanggal)
	}
	if query.TanggalPembanding != "" {
		form.Set("tanggal_pembanding", query.TanggalPembanding)
	}
	if query.KodeProvinsi != "" {
		form.Set("kode_provinsi", query.KodeProvinsi)
	}
	if query.KodeKabKota != "" {
		form.Set("kode_kab_kota", query.KodeKabKota)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("gagal membuat request harga pasar SP2KP: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "TandurApp/1.0 (Commodity Market Price Aggregator)")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal menghubungi API SP2KP Kemendag: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca respons API SP2KP: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API SP2KP mengembalikan status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var apiResp sp2kpAPIResponse
	if err := json.Unmarshal(bodyBytes, &apiResp); err != nil {
		return nil, fmt.Errorf("gagal membaca format JSON respons SP2KP: %w", err)
	}

	return apiResp.Data, nil
}
