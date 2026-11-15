package tests

import (
	"context"
	"testing"

	"tandur/api/internal/application"
	"tandur/api/internal/infrastructure/persistence"
)

func TestCommodityService(t *testing.T) {
	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo)

	commodities, err := service.ListCommodities(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(commodities) == 0 {
		t.Errorf("expected seeded commodities, got 0")
	}
}

