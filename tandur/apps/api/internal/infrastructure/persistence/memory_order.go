package persistence

import (
	"context"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"tandur/api/internal/domain"
)

type MemoryOrderRepository struct {
	mu     sync.RWMutex
	orders map[string]*domain.FarmerPurchaseOrder
}

func NewMemoryOrderRepository() *MemoryOrderRepository {
	return &MemoryOrderRepository{
		orders: make(map[string]*domain.FarmerPurchaseOrder),
	}
}

func (r *MemoryOrderRepository) Create(ctx context.Context, order *domain.FarmerPurchaseOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	item := *order
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now()
	}
	item.UpdatedAt = item.CreatedAt
	item.StatusLabel = domain.GetStatusLabel(item.Status)
	item.MarginNote = domain.FormatMarginNote(item.OfferedPrice, item.BenchmarkPrice)

	r.orders[order.ID] = &item
	return nil
}

func (r *MemoryOrderRepository) GetByID(ctx context.Context, id string) (*domain.FarmerPurchaseOrder, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	o, ok := r.orders[id]
	if !ok {
		return nil, domain.ErrOrderNotFound
	}
	item := *o
	return &item, nil
}

func (r *MemoryOrderRepository) GetByOrderCode(ctx context.Context, code string) (*domain.FarmerPurchaseOrder, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, o := range r.orders {
		if strings.EqualFold(o.OrderCode, code) {
			item := *o
			return &item, nil
		}
	}
	return nil, domain.ErrOrderNotFound
}

func (r *MemoryOrderRepository) List(ctx context.Context, filter domain.OrderFilter) (*domain.PaginatedOrders, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]domain.FarmerPurchaseOrder, 0)
	var totalSalesMonth float64 = 0
	var allCount, waitingCount, scheduledCount, completedCount, cancelledCount int64

	now := time.Now()
	currentMonth := now.Month()
	currentYear := now.Year()

	for _, o := range r.orders {
		// Filter farmer or middleman
		if filter.FarmerID != "" && o.FarmerID != filter.FarmerID {
			continue
		}
		if filter.MiddlemanID != "" && o.MiddlemanID != filter.MiddlemanID {
			continue
		}

		// Count tabs
		allCount++
		switch o.Status {
		case domain.OrderStatusWaitingConfirmation, domain.OrderStatusInNegotiation:
			waitingCount++
		case domain.OrderStatusScheduledPickup:
			scheduledCount++
		case domain.OrderStatusCompleted:
			completedCount++
			if o.CreatedAt.Month() == currentMonth && o.CreatedAt.Year() == currentYear {
				if o.FinalTotalAmount != nil && *o.FinalTotalAmount > 0 {
					totalSalesMonth += *o.FinalTotalAmount
				} else {
					totalSalesMonth += o.TotalPrice
				}
			}
		case domain.OrderStatusCancelled:
			cancelledCount++
		}

		// Tab filter
		if filter.Tab == "waiting_confirmation" && o.Status != domain.OrderStatusWaitingConfirmation && o.Status != domain.OrderStatusInNegotiation {
			continue
		}
		if filter.Tab == "scheduled_pickup" && o.Status != domain.OrderStatusScheduledPickup {
			continue
		}
		if filter.Tab == "completed_paid" && o.Status != domain.OrderStatusCompleted {
			continue
		}
		if filter.Tab == "cancelled" && o.Status != domain.OrderStatusCancelled {
			continue
		}

		// Search filter
		if filter.Search != "" {
			term := strings.ToLower(filter.Search)
			if !strings.Contains(strings.ToLower(o.OrderCode), term) &&
				!strings.Contains(strings.ToLower(o.ListingTitle), term) &&
				!strings.Contains(strings.ToLower(o.BuyerName), term) &&
				!strings.Contains(strings.ToLower(o.CommodityName), term) {
				continue
			}
		}

		filtered = append(filtered, *o)
	}

	// Sort desc by CreatedAt
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
	})

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	totalItems := int64(len(filtered))
	startIndex := (page - 1) * limit
	if startIndex >= len(filtered) {
		return &domain.PaginatedOrders{
			Items: []domain.FarmerPurchaseOrder{},
			Summary: domain.FarmerOrderSummary{
				TotalSalesThisMonth:      totalSalesMonth,
				PartnerRating:            4.9,
				AllCount:                 allCount,
				WaitingConfirmationCount: waitingCount,
				ScheduledPickupCount:     scheduledCount,
				CompletedPaidCount:       completedCount,
				CancelledCount:           cancelledCount,
			},
			TotalItems: totalItems,
			Page:       page,
			Limit:      limit,
			TotalPages: int(math.Ceil(float64(totalItems) / float64(limit))),
		}, nil
	}

	endIndex := startIndex + limit
	if endIndex > len(filtered) {
		endIndex = len(filtered)
	}

	paged := filtered[startIndex:endIndex]
	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	return &domain.PaginatedOrders{
		Items: paged,
		Summary: domain.FarmerOrderSummary{
			TotalSalesThisMonth:      totalSalesMonth,
			PartnerRating:            4.9,
			AllCount:                 allCount,
			WaitingConfirmationCount: waitingCount,
			ScheduledPickupCount:     scheduledCount,
			CompletedPaidCount:       completedCount,
			CancelledCount:           cancelledCount,
		},
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *MemoryOrderRepository) Update(ctx context.Context, order *domain.FarmerPurchaseOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	o, ok := r.orders[order.ID]
	if !ok {
		return domain.ErrOrderNotFound
	}
	item := *order
	item.UpdatedAt = time.Now()
	item.StatusLabel = domain.GetStatusLabel(item.Status)
	item.MarginNote = domain.FormatMarginNote(item.OfferedPrice, item.BenchmarkPrice)

	*o = item
	return nil
}
