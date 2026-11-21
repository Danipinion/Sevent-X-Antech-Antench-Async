package persistence

import (
	"context"
	"math"
	"sort"
	"sync"
	"time"

	"tandur/api/internal/domain"
)

type MemoryListingRepository struct {
	mu       sync.RWMutex
	listings map[string]*domain.FarmerListing
}

func NewMemoryListingRepository() *MemoryListingRepository {
	return &MemoryListingRepository{
		listings: make(map[string]*domain.FarmerListing),
	}
}

func (r *MemoryListingRepository) Create(ctx context.Context, listing *domain.FarmerListing) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	item := *listing
	r.listings[listing.ID] = &item
	return nil
}

func (r *MemoryListingRepository) GetByID(ctx context.Context, id string) (*domain.FarmerListing, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	l, ok := r.listings[id]
	if !ok || l.DeletedAt != nil {
		return nil, domain.ErrListingNotFound
	}

	item := *l
	return &item, nil
}

func (r *MemoryListingRepository) List(ctx context.Context, filter domain.ListingFilter) (*domain.PaginatedListings, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	all := make([]domain.FarmerListing, 0)
	for _, l := range r.listings {
		if l.DeletedAt != nil {
			continue
		}
		if filter.FarmerID != "" && l.FarmerID != filter.FarmerID {
			continue
		}
		if filter.Status != "" && filter.Status != "all" && string(l.Status) != filter.Status {
			continue
		}
		if filter.CommodityID != "" && l.CommodityID != filter.CommodityID {
			continue
		}
		all = append(all, *l)
	}

	// Sort desc by CreatedAt
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})

	totalItems := int64(len(all))
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	startIndex := (page - 1) * limit
	if startIndex >= len(all) {
		return &domain.PaginatedListings{
			Items:      []domain.FarmerListing{},
			TotalItems: totalItems,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		}, nil
	}

	endIndex := startIndex + limit
	if endIndex > len(all) {
		endIndex = len(all)
	}

	pagedItems := make([]domain.FarmerListing, len(all[startIndex:endIndex]))
	copy(pagedItems, all[startIndex:endIndex])

	return &domain.PaginatedListings{
		Items:      pagedItems,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *MemoryListingRepository) Update(ctx context.Context, listing *domain.FarmerListing) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	l, ok := r.listings[listing.ID]
	if !ok || l.DeletedAt != nil || l.FarmerID != listing.FarmerID {
		return domain.ErrListingNotFound
	}

	item := *listing
	item.UpdatedAt = time.Now()
	r.listings[listing.ID] = &item
	return nil
}

func (r *MemoryListingRepository) SoftDelete(ctx context.Context, id string, farmerID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	l, ok := r.listings[id]
	if !ok || l.DeletedAt != nil || l.FarmerID != farmerID {
		return domain.ErrListingNotFound
	}

	now := time.Now()
	l.Status = domain.ListingStatusCancelled
	l.DeletedAt = &now
	l.UpdatedAt = now
	return nil
}
