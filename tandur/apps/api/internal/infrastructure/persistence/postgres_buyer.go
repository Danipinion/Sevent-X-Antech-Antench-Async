package persistence

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/geospatial"
)

type PostgresBuyerRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresBuyerRepository(pool *pgxpool.Pool) *PostgresBuyerRepository {
	return &PostgresBuyerRepository{pool: pool}
}

func (r *PostgresBuyerRepository) ListCategories(ctx context.Context) ([]domain.ProductCategory, error) {
	defaults := []domain.ProductCategory{
		{ID: "cat-beras", Slug: "beras", Name: "Beras", Description: "Beras premium, medium, dan gabah lokal", Icon: "grain"},
		{ID: "cat-sayur", Slug: "sayur-segar", Name: "Sayur Segar", Description: "Sayuran hijau dan segar langsung dari kebun", Icon: "leaf"},
		{ID: "cat-buah", Slug: "buah", Name: "Buah", Description: "Buah-buahan segar hasil panen lokal", Icon: "apple"},
		{ID: "cat-bumbu", Slug: "bumbu-rempah", Name: "Bumbu & Rempah", Description: "Cabai, bawang merah, bawang putih, dan rempah dapur", Icon: "flame"},
	}

	if r.pool == nil {
		return defaults, nil
	}

	rows, err := r.pool.Query(ctx, `SELECT DISTINCT category FROM commodities WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`)
	if err != nil {
		return defaults, nil
	}
	defer rows.Close()

	seen := make(map[string]bool)
	for _, c := range defaults {
		seen[strings.ToLower(c.Name)] = true
		seen[strings.ToLower(c.Slug)] = true
	}

	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err == nil && cat != "" {
			key := strings.ToLower(strings.TrimSpace(cat))
			if !seen[key] {
				slug := strings.ReplaceAll(key, " ", "-")
				defaults = append(defaults, domain.ProductCategory{
					ID:   "cat-" + slug,
					Slug: slug,
					Name: cat,
				})
				seen[key] = true
			}
		}
	}
	return defaults, nil
}

func (r *PostgresBuyerRepository) ListProducts(ctx context.Context, filter domain.BuyerProductFilter) (*domain.PaginatedBuyerProducts, error) {
	radiusKm := filter.RadiusKm
	if radiusKm <= 0 || radiusKm > domain.MaxBuyerRadiusKm {
		radiusKm = domain.MaxBuyerRadiusKm
	}

	var products []domain.BuyerProduct
	sourceLower := strings.ToLower(strings.TrimSpace(filter.Source))

	// 1. Ambil produk dari Tengkulak / Distributor (selalu diizinkan jika source kosong/all/middleman)
	if sourceLower == "" || sourceLower == "all" || sourceLower == domain.ProductSourceMiddleman {
		midProducts, err := r.queryMiddlemanProducts(ctx, filter, radiusKm)
		if err == nil {
			products = append(products, midProducts...)
		}
	}

	// 2. Ambil produk langsung dari Petani (HANYA jika AllowFarmerSource == true)
	if filter.AllowFarmerSource && (sourceLower == "" || sourceLower == "all" || sourceLower == domain.ProductSourceFarmer) {
		farmerProducts, err := r.queryFarmerProducts(ctx, filter, radiusKm)
		if err == nil {
			products = append(products, farmerProducts...)
		}
	}

	sort.Slice(products, func(i, j int) bool {
		if filter.Latitude != nil && filter.Longitude != nil && products[i].DistanceKm != products[j].DistanceKm {
			return products[i].DistanceKm < products[j].DistanceKm
		}
		return products[i].CreatedAt.After(products[j].CreatedAt)
	})

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}

	totalItems := int64(len(products))
	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * limit
	if start >= len(products) {
		products = []domain.BuyerProduct{}
	} else {
		end := start + limit
		if end > len(products) {
			end = len(products)
		}
		products = products[start:end]
	}

	return &domain.PaginatedBuyerProducts{
		Items:      products,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresBuyerRepository) queryMiddlemanProducts(ctx context.Context, filter domain.BuyerProductFilter, radiusKm float64) ([]domain.BuyerProduct, error) {
	hasCoord := filter.Latitude != nil && filter.Longitude != nil
	var lat, lng float64
	if hasCoord {
		lat = *filter.Latitude
		lng = *filter.Longitude
	}

	query := `
		SELECT
			msl.id::text,
			msl.commodity_name,
			msl.category,
			msl.variety,
			msl.selling_price_per_kg,
			(msl.offered_tons * 1000.0) AS stock_kg,
			(msl.min_order_tons * 1000.0) AS min_order_kg,
			msl.created_at,
			u.id::text,
			u.name,
			u.phone,
			COALESCE(ul.address, ''),
			COALESCE(ul.city, ''),
			COALESCE(ul.province, ''),
			COALESCE(ST_Y(ul.location::geometry), 0),
			COALESCE(ST_X(ul.location::geometry), 0),
			CASE
				WHEN $1::boolean AND ul.location IS NOT NULL THEN
					ST_Distance(ul.location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography) / 1000.0
				ELSE 0
			END AS distance_km,
			COALESCE((SELECT SUM(boi.quantity)::bigint FROM buyer_order_items boi WHERE boi.product_id = msl.id), 0) AS sold_count
		FROM middleman_sales_listings msl
		JOIN users u ON u.id = msl.middleman_id
		LEFT JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
		WHERE msl.status = 'active'
		  AND msl.offered_tons > 0
		  AND ($4 = '' OR LOWER(msl.category) = LOWER($4) OR LOWER('cat-' || REPLACE(msl.category, ' ', '-')) = LOWER($4))
		  AND ($5 = '' OR LOWER(msl.commodity_name) LIKE '%' || LOWER($5) || '%' OR LOWER(msl.variety) LIKE '%' || LOWER($5) || '%')
		  AND (
			NOT $1::boolean
			OR ul.location IS NULL
			OR ST_DWithin(ul.location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $6 * 1000.0)
		  )
		ORDER BY distance_km ASC, msl.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, hasCoord, lat, lng, strings.TrimSpace(filter.CategoryID), strings.TrimSpace(filter.Search), radiusKm)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.BuyerProduct
	for rows.Next() {
		var p domain.BuyerProduct
		var variety string
		if err := rows.Scan(
			&p.ID, &p.CommodityName, &p.CategoryName, &variety, &p.Price,
			&p.AvailableStock, &p.MinOrderQuantity, &p.CreatedAt,
			&p.Seller.ID, &p.Seller.Name, &p.Seller.Phone,
			&p.Seller.Address, &p.Seller.City, &p.Seller.Province,
			&p.Seller.Latitude, &p.Seller.Longitude,
			&p.DistanceKm, &p.SoldCount,
		); err != nil {
			continue
		}
		if filter.IsPreorder != nil && *filter.IsPreorder {
			continue
		}
		p.Source = domain.ProductSourceMiddleman
		p.SourceLabel = "Tengkulak / Distributor"
		p.CategoryID = "cat-" + strings.ReplaceAll(strings.ToLower(p.CategoryName), " ", "-")
		p.Name = strings.TrimSpace(p.CommodityName + " " + variety)
		p.Unit = "kg"
		p.IsPreorder = false
		p.MediaURLs = []string{}
		p.Seller.Role = "middleman"
		p.Seller.RoleLabel = "Tengkulak / Distributor"
		p.DistanceKm = math.Round(p.DistanceKm*100) / 100
		result = append(result, p)
	}
	return result, nil
}

func (r *PostgresBuyerRepository) queryFarmerProducts(ctx context.Context, filter domain.BuyerProductFilter, radiusKm float64) ([]domain.BuyerProduct, error) {
	hasCoord := filter.Latitude != nil && filter.Longitude != nil
	var lat, lng float64
	if hasCoord {
		lat = *filter.Latitude
		lng = *filter.Longitude
	}

	query := `
		SELECT
			fl.id::text,
			COALESCE(fl.commodity_id::text, ''),
			COALESCE(c.name, fl.title),
			COALESCE(c.category, 'lainnya'),
			fl.title,
			COALESCE(fl.description, ''),
			COALESCE(fl.price_per_unit, 0),
			fl.unit,
			fl.available_quantity,
			COALESCE(fl.min_order_quantity, 1),
			COALESCE(TO_CHAR(fl.estimated_harvest_date, 'YYYY-MM-DD'), ''),
			COALESCE(fl.media_urls, ARRAY[]::TEXT[]),
			fl.created_at,
			u.id::text,
			u.name,
			u.phone,
			COALESCE(fl.pickup_address, ul.address, ''),
			COALESCE(ul.city, ''),
			COALESCE(ul.province, ''),
			COALESCE(ST_Y(fl.location::geometry), 0),
			COALESCE(ST_X(fl.location::geometry), 0),
			CASE
				WHEN $1::boolean AND fl.location IS NOT NULL THEN
					ST_Distance(fl.location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography) / 1000.0
				ELSE 0
			END AS distance_km,
			COALESCE((SELECT SUM(boi.quantity)::bigint FROM buyer_order_items boi WHERE boi.product_id = fl.id), 0) AS sold_count
		FROM farmer_listings fl
		JOIN users u ON u.id = fl.farmer_id
		LEFT JOIN commodities c ON c.id = fl.commodity_id
		LEFT JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
		WHERE fl.status = 'published'
		  AND fl.deleted_at IS NULL
		  AND fl.available_quantity > 0
		  AND ($4 = '' OR LOWER(COALESCE(c.category, '')) = LOWER($4) OR LOWER('cat-' || REPLACE(COALESCE(c.category, ''), ' ', '-')) = LOWER($4))
		  AND ($5 = '' OR LOWER(fl.title) LIKE '%' || LOWER($5) || '%' OR LOWER(COALESCE(c.name, '')) LIKE '%' || LOWER($5) || '%')
		  AND (
			NOT $1::boolean
			OR fl.location IS NULL
			OR ST_DWithin(fl.location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $6 * 1000.0)
		  )
		ORDER BY distance_km ASC, fl.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, hasCoord, lat, lng, strings.TrimSpace(filter.CategoryID), strings.TrimSpace(filter.Search), radiusKm)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.BuyerProduct
	today := time.Now().Format("2006-01-02")
	for rows.Next() {
		var p domain.BuyerProduct
		if err := rows.Scan(
			&p.ID, &p.CommodityID, &p.CommodityName, &p.CategoryName, &p.Name,
			&p.Description, &p.Price, &p.Unit, &p.AvailableStock, &p.MinOrderQuantity,
			&p.EstimatedHarvestDate, &p.MediaURLs, &p.CreatedAt,
			&p.Seller.ID, &p.Seller.Name, &p.Seller.Phone,
			&p.Seller.Address, &p.Seller.City, &p.Seller.Province,
			&p.Seller.Latitude, &p.Seller.Longitude,
			&p.DistanceKm, &p.SoldCount,
		); err != nil {
			continue
		}
		p.IsPreorder = p.EstimatedHarvestDate != "" && p.EstimatedHarvestDate > today
		if filter.IsPreorder != nil && p.IsPreorder != *filter.IsPreorder {
			continue
		}
		p.Source = domain.ProductSourceFarmer
		p.SourceLabel = "Langsung dari Petani"
		p.CategoryID = "cat-" + strings.ReplaceAll(strings.ToLower(p.CategoryName), " ", "-")
		if len(p.MediaURLs) > 0 {
			p.PrimaryImageURL = p.MediaURLs[0]
		}
		p.Seller.Role = "farmer"
		p.Seller.RoleLabel = "Petani"
		p.DistanceKm = math.Round(p.DistanceKm*100) / 100
		result = append(result, p)
	}
	return result, nil
}

func (r *PostgresBuyerRepository) ListPopularProducts(ctx context.Context, filter domain.BuyerProductFilter) ([]domain.BuyerProduct, error) {
	filter.Page = 1
	if filter.Limit <= 0 {
		filter.Limit = 10
	}
	all, err := r.ListProducts(ctx, domain.BuyerProductFilter{
		Latitude:          filter.Latitude,
		Longitude:         filter.Longitude,
		RadiusKm:          filter.RadiusKm,
		AllowFarmerSource: filter.AllowFarmerSource,
		Page:              1,
		Limit:             100,
	})
	if err != nil {
		return nil, err
	}

	cityLower := strings.ToLower(strings.TrimSpace(filter.City))
	var items []domain.BuyerProduct
	for _, p := range all.Items {
		if cityLower != "" && !strings.Contains(strings.ToLower(p.Seller.City), cityLower) {
			continue
		}
		items = append(items, p)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].SoldCount > items[j].SoldCount
	})
	if len(items) > filter.Limit {
		items = items[:filter.Limit]
	}
	return items, nil
}

func (r *PostgresBuyerRepository) GetProductByID(ctx context.Context, productID string, sourceHint string) (*domain.BuyerProduct, error) {
	if sourceHint == "" || sourceHint == domain.ProductSourceMiddleman {
		if p, err := r.getMiddlemanProductByID(ctx, productID); err == nil {
			return p, nil
		}
	}
	if sourceHint == "" || sourceHint == domain.ProductSourceFarmer {
		if p, err := r.getFarmerProductByID(ctx, productID); err == nil {
			return p, nil
		}
	}
	return nil, domain.ErrProductNotFound
}

func (r *PostgresBuyerRepository) getMiddlemanProductByID(ctx context.Context, id string) (*domain.BuyerProduct, error) {
	var p domain.BuyerProduct
	var variety string
	err := r.pool.QueryRow(ctx, `
		SELECT
			msl.id::text, msl.commodity_name, msl.category, msl.variety,
			msl.selling_price_per_kg, (msl.offered_tons * 1000.0), (msl.min_order_tons * 1000.0),
			msl.created_at, u.id::text, u.name, u.phone,
			COALESCE(ul.address, ''), COALESCE(ul.city, ''), COALESCE(ul.province, ''),
			COALESCE(ST_Y(ul.location::geometry), 0), COALESCE(ST_X(ul.location::geometry), 0)
		FROM middleman_sales_listings msl
		JOIN users u ON u.id = msl.middleman_id
		LEFT JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
		WHERE msl.id = $1::uuid AND msl.status = 'active'
	`, id).Scan(
		&p.ID, &p.CommodityName, &p.CategoryName, &variety,
		&p.Price, &p.AvailableStock, &p.MinOrderQuantity,
		&p.CreatedAt, &p.Seller.ID, &p.Seller.Name, &p.Seller.Phone,
		&p.Seller.Address, &p.Seller.City, &p.Seller.Province,
		&p.Seller.Latitude, &p.Seller.Longitude,
	)
	if err != nil {
		return nil, domain.ErrProductNotFound
	}
	p.Source = domain.ProductSourceMiddleman
	p.SourceLabel = "Tengkulak / Distributor"
	p.CategoryID = "cat-" + strings.ReplaceAll(strings.ToLower(p.CategoryName), " ", "-")
	p.Name = strings.TrimSpace(p.CommodityName + " " + variety)
	p.Unit = "kg"
	p.MediaURLs = []string{}
	p.Seller.Role = "middleman"
	p.Seller.RoleLabel = "Tengkulak / Distributor"
	return &p, nil
}

func (r *PostgresBuyerRepository) getFarmerProductByID(ctx context.Context, id string) (*domain.BuyerProduct, error) {
	var p domain.BuyerProduct
	err := r.pool.QueryRow(ctx, `
		SELECT
			fl.id::text, COALESCE(fl.commodity_id::text, ''), COALESCE(c.name, fl.title),
			COALESCE(c.category, 'lainnya'), fl.title, COALESCE(fl.description, ''),
			COALESCE(fl.price_per_unit, 0), fl.unit, fl.available_quantity,
			COALESCE(fl.min_order_quantity, 1),
			COALESCE(TO_CHAR(fl.estimated_harvest_date, 'YYYY-MM-DD'), ''),
			COALESCE(fl.media_urls, ARRAY[]::TEXT[]), fl.created_at,
			u.id::text, u.name, u.phone,
			COALESCE(fl.pickup_address, ul.address, ''), COALESCE(ul.city, ''), COALESCE(ul.province, ''),
			COALESCE(ST_Y(fl.location::geometry), 0), COALESCE(ST_X(fl.location::geometry), 0)
		FROM farmer_listings fl
		JOIN users u ON u.id = fl.farmer_id
		LEFT JOIN commodities c ON c.id = fl.commodity_id
		LEFT JOIN user_locations ul ON ul.user_id = u.id AND ul.is_primary = TRUE
		WHERE fl.id = $1::uuid AND fl.status = 'published' AND fl.deleted_at IS NULL
	`, id).Scan(
		&p.ID, &p.CommodityID, &p.CommodityName,
		&p.CategoryName, &p.Name, &p.Description,
		&p.Price, &p.Unit, &p.AvailableStock,
		&p.MinOrderQuantity, &p.EstimatedHarvestDate,
		&p.MediaURLs, &p.CreatedAt,
		&p.Seller.ID, &p.Seller.Name, &p.Seller.Phone,
		&p.Seller.Address, &p.Seller.City, &p.Seller.Province,
		&p.Seller.Latitude, &p.Seller.Longitude,
	)
	if err != nil {
		return nil, domain.ErrProductNotFound
	}
	p.Source = domain.ProductSourceFarmer
	p.SourceLabel = "Langsung dari Petani"
	p.CategoryID = "cat-" + strings.ReplaceAll(strings.ToLower(p.CategoryName), " ", "-")
	p.IsPreorder = p.EstimatedHarvestDate != "" && p.EstimatedHarvestDate > time.Now().Format("2006-01-02")
	if len(p.MediaURLs) > 0 {
		p.PrimaryImageURL = p.MediaURLs[0]
	}
	p.Seller.Role = "farmer"
	p.Seller.RoleLabel = "Petani"
	return &p, nil
}

func (r *PostgresBuyerRepository) GetCartItems(ctx context.Context, buyerID string) ([]domain.CartItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, buyer_id::text, product_id::text, product_source, seller_id::text, quantity, created_at, updated_at
		FROM buyer_cart_items
		WHERE buyer_id = $1::uuid
		ORDER BY created_at ASC
	`, buyerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.CartItem
	for rows.Next() {
		var ci domain.CartItem
		if err := rows.Scan(&ci.ID, &ci.BuyerID, &ci.ProductID, &ci.ProductSource, &ci.SellerID, &ci.Quantity, &ci.CreatedAt, &ci.UpdatedAt); err != nil {
			continue
		}
		if prod, err := r.GetProductByID(ctx, ci.ProductID, ci.ProductSource); err == nil {
			ci.ProductName = prod.Name
			ci.CommodityName = prod.CommodityName
			ci.CategoryName = prod.CategoryName
			ci.Unit = prod.Unit
			ci.UnitPrice = prod.Price
			ci.AvailableStock = prod.AvailableStock
			ci.MediaURL = prod.PrimaryImageURL
			ci.IsPreorder = prod.IsPreorder
			ci.Seller = prod.Seller
			ci.Subtotal = ci.Quantity * prod.Price
		}
		items = append(items, ci)
	}
	return items, nil
}

func (r *PostgresBuyerRepository) GetCartItemByID(ctx context.Context, buyerID string, itemID string) (*domain.CartItem, error) {
	var ci domain.CartItem
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, buyer_id::text, product_id::text, product_source, seller_id::text, quantity, created_at, updated_at
		FROM buyer_cart_items
		WHERE id = $1::uuid AND buyer_id = $2::uuid
	`, itemID, buyerID).Scan(&ci.ID, &ci.BuyerID, &ci.ProductID, &ci.ProductSource, &ci.SellerID, &ci.Quantity, &ci.CreatedAt, &ci.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCartItemNotFound
		}
		return nil, err
	}
	if prod, err := r.GetProductByID(ctx, ci.ProductID, ci.ProductSource); err == nil {
		ci.ProductName = prod.Name
		ci.Unit = prod.Unit
		ci.UnitPrice = prod.Price
		ci.AvailableStock = prod.AvailableStock
		ci.MediaURL = prod.PrimaryImageURL
		ci.Seller = prod.Seller
		ci.Subtotal = ci.Quantity * prod.Price
	}
	return &ci, nil
}

func (r *PostgresBuyerRepository) UpsertCartItem(ctx context.Context, buyerID string, product *domain.BuyerProduct, quantity float64) (*domain.CartItem, error) {
	var existingID string
	var existingQty float64
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, quantity FROM buyer_cart_items
		WHERE buyer_id = $1::uuid AND product_id = $2::uuid AND product_source = $3
	`, buyerID, product.ID, product.Source).Scan(&existingID, &existingQty)

	if err == nil {
		newQty := existingQty + quantity
		if newQty > product.AvailableStock {
			return nil, domain.ErrStockExceeded
		}
		return r.UpdateCartItemQuantity(ctx, buyerID, existingID, newQty)
	}

	if quantity > product.AvailableStock {
		return nil, domain.ErrStockExceeded
	}

	newID := uuid.New().String()
	now := time.Now()
	_, err = r.pool.Exec(ctx, `
		INSERT INTO buyer_cart_items (id, buyer_id, product_id, product_source, seller_id, quantity, created_at, updated_at)
		VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6, $7, $7)
	`, newID, buyerID, product.ID, product.Source, product.Seller.ID, quantity, now)
	if err != nil {
		return nil, err
	}

	return &domain.CartItem{
		ID:             newID,
		BuyerID:        buyerID,
		ProductID:      product.ID,
		ProductSource:  product.Source,
		SellerID:       product.Seller.ID,
		ProductName:    product.Name,
		CommodityName:  product.CommodityName,
		CategoryName:   product.CategoryName,
		Unit:           product.Unit,
		UnitPrice:      product.Price,
		Quantity:       quantity,
		AvailableStock: product.AvailableStock,
		Subtotal:       quantity * product.Price,
		MediaURL:       product.PrimaryImageURL,
		IsPreorder:     product.IsPreorder,
		Seller:         product.Seller,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

func (r *PostgresBuyerRepository) UpdateCartItemQuantity(ctx context.Context, buyerID string, itemID string, quantity float64) (*domain.CartItem, error) {
	ci, err := r.GetCartItemByID(ctx, buyerID, itemID)
	if err != nil {
		return nil, err
	}
	if quantity > ci.AvailableStock {
		return nil, domain.ErrStockExceeded
	}
	now := time.Now()
	_, err = r.pool.Exec(ctx, `
		UPDATE buyer_cart_items SET quantity = $1, updated_at = $2
		WHERE id = $3::uuid AND buyer_id = $4::uuid
	`, quantity, now, itemID, buyerID)
	if err != nil {
		return nil, err
	}
	ci.Quantity = quantity
	ci.Subtotal = quantity * ci.UnitPrice
	ci.UpdatedAt = now
	return ci, nil
}

func (r *PostgresBuyerRepository) DeleteCartItem(ctx context.Context, buyerID string, itemID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM buyer_cart_items WHERE id = $1::uuid AND buyer_id = $2::uuid`, itemID, buyerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrCartItemNotFound
	}
	return nil
}

func (r *PostgresBuyerRepository) DeleteCartItemsByIDs(ctx context.Context, buyerID string, itemIDs []string) error {
	if len(itemIDs) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `DELETE FROM buyer_cart_items WHERE buyer_id = $1::uuid AND id::text = ANY($2)`, buyerID, itemIDs)
	return err
}

func (r *PostgresBuyerRepository) ReserveProductStock(ctx context.Context, productID string, source string, qty float64) error {
	if source == domain.ProductSourceFarmer {
		tag, err := r.pool.Exec(ctx, `
			UPDATE farmer_listings
			SET available_quantity = available_quantity - $1, updated_at = NOW()
			WHERE id = $2::uuid AND available_quantity >= $1
		`, qty, productID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrStockExceeded
		}
		return nil
	}

	qtyTons := qty / 1000.0
	tag, err := r.pool.Exec(ctx, `
		UPDATE middleman_sales_listings
		SET offered_tons = offered_tons - $1, updated_at = NOW()
		WHERE id = $2::uuid AND offered_tons >= $1
	`, qtyTons, productID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrStockExceeded
	}
	return nil
}

func (r *PostgresBuyerRepository) RestoreProductStock(ctx context.Context, productID string, source string, qty float64) error {
	if source == domain.ProductSourceFarmer {
		_, err := r.pool.Exec(ctx, `
			UPDATE farmer_listings
			SET available_quantity = LEAST(estimated_quantity, available_quantity + $1), updated_at = NOW()
			WHERE id = $2::uuid
		`, qty, productID)
		return err
	}

	qtyTons := qty / 1000.0
	_, err := r.pool.Exec(ctx, `
		UPDATE middleman_sales_listings
		SET offered_tons = offered_tons + $1, updated_at = NOW()
		WHERE id = $2::uuid
	`, qtyTons, productID)
	return err
}

func (r *PostgresBuyerRepository) CreateBuyerOrder(ctx context.Context, order *domain.BuyerOrder) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	now := time.Now()
	order.CreatedAt = now
	order.UpdatedAt = now

	var pickupLocID interface{}
	if order.PickupLocationID != "" {
		pickupLocID = order.PickupLocationID
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO buyer_orders (
			id, buyer_id, order_number, seller_id, seller_name, seller_phone, seller_role,
			subtotal_amount, handling_fee, total_amount, payment_method, status,
			pickup_location_id, pickup_address, pickup_latitude, pickup_longitude, notes,
			created_at, updated_at
		) VALUES (
			$1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17,
			$18, $18
		)
	`, order.ID, order.BuyerID, order.OrderNumber, order.SellerID, order.SellerName, order.SellerPhone, order.SellerRole,
		order.SubtotalAmount, order.HandlingFee, order.TotalAmount, order.PaymentMethod, order.Status,
		pickupLocID, order.PickupAddress, order.PickupLatitude, order.PickupLongitude, order.Notes, now)
	if err != nil {
		return fmt.Errorf("gagal menyimpan pesanan pembeli: %w", err)
	}

	for i := range order.Items {
		if order.Items[i].ID == "" {
			order.Items[i].ID = uuid.New().String()
		}
		order.Items[i].OrderID = order.ID
		item := order.Items[i]
		_, err = tx.Exec(ctx, `
			INSERT INTO buyer_order_items (
				id, order_id, product_id, product_source, product_name, seller_id,
				quantity, unit, unit_price, subtotal, media_url
			) VALUES (
				$1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid,
				$7, $8, $9, $10, $11
			)
		`, item.ID, order.ID, item.ProductID, item.ProductSource, item.ProductName, item.SellerID,
			item.Quantity, item.Unit, item.UnitPrice, item.Subtotal, item.MediaURL)
		if err != nil {
			return fmt.Errorf("gagal menyimpan item pesanan pembeli: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresBuyerRepository) ListBuyerOrders(ctx context.Context, filter domain.BuyerOrderFilter) (*domain.PaginatedBuyerOrders, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit
	statusFilter := strings.ToLower(strings.TrimSpace(filter.Status))
	if statusFilter == "all" {
		statusFilter = ""
	}

	var totalItems int64
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM buyer_orders
		WHERE buyer_id = $1::uuid AND ($2 = '' OR LOWER(status) = $2)
	`, filter.BuyerID, statusFilter).Scan(&totalItems)

	rows, err := r.pool.Query(ctx, `
		SELECT
			id::text, order_number, buyer_id::text, COALESCE(seller_id::text, ''),
			COALESCE(seller_name, ''), COALESCE(seller_phone, ''), COALESCE(seller_role, 'middleman'),
			subtotal_amount, handling_fee, total_amount, payment_method, status,
			COALESCE(pickup_location_id::text, ''), COALESCE(pickup_address, ''),
			COALESCE(pickup_latitude, 0), COALESCE(pickup_longitude, 0), COALESCE(notes, ''),
			confirmed_receipt_at, cancelled_at, created_at, updated_at
		FROM buyer_orders
		WHERE buyer_id = $1::uuid AND ($2 = '' OR LOWER(status) = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`, filter.BuyerID, statusFilter, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.BuyerOrder
	for rows.Next() {
		var o domain.BuyerOrder
		if err := rows.Scan(
			&o.ID, &o.OrderNumber, &o.BuyerID, &o.SellerID,
			&o.SellerName, &o.SellerPhone, &o.SellerRole,
			&o.SubtotalAmount, &o.HandlingFee, &o.TotalAmount, &o.PaymentMethod, &o.Status,
			&o.PickupLocationID, &o.PickupAddress, &o.PickupLatitude, &o.PickupLongitude, &o.Notes,
			&o.ConfirmedReceiptAt, &o.CancelledAt, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			continue
		}
		o.StatusLabel = domain.GetBuyerOrderStatusLabel(o.Status)
		o.PaymentLabel = "Tunai di Tempat (Cash on Pickup)"
		o.CashToPrepare = o.TotalAmount
		o.Items, _ = r.getOrderItems(ctx, o.ID)
		orders = append(orders, o)
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	return &domain.PaginatedBuyerOrders{
		Items:      orders,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresBuyerRepository) GetBuyerOrderByID(ctx context.Context, orderID string) (*domain.BuyerOrder, error) {
	var o domain.BuyerOrder
	err := r.pool.QueryRow(ctx, `
		SELECT
			id::text, order_number, buyer_id::text, COALESCE(seller_id::text, ''),
			COALESCE(seller_name, ''), COALESCE(seller_phone, ''), COALESCE(seller_role, 'middleman'),
			subtotal_amount, handling_fee, total_amount, payment_method, status,
			COALESCE(pickup_location_id::text, ''), COALESCE(pickup_address, ''),
			COALESCE(pickup_latitude, 0), COALESCE(pickup_longitude, 0), COALESCE(notes, ''),
			confirmed_receipt_at, cancelled_at, created_at, updated_at
		FROM buyer_orders
		WHERE id = $1::uuid
	`, orderID).Scan(
		&o.ID, &o.OrderNumber, &o.BuyerID, &o.SellerID,
		&o.SellerName, &o.SellerPhone, &o.SellerRole,
		&o.SubtotalAmount, &o.HandlingFee, &o.TotalAmount, &o.PaymentMethod, &o.Status,
		&o.PickupLocationID, &o.PickupAddress, &o.PickupLatitude, &o.PickupLongitude, &o.Notes,
		&o.ConfirmedReceiptAt, &o.CancelledAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrBuyerOrderNotFound
		}
		return nil, err
	}
	o.StatusLabel = domain.GetBuyerOrderStatusLabel(o.Status)
	o.PaymentLabel = "Tunai di Tempat (Cash on Pickup)"
	o.CashToPrepare = o.TotalAmount
	o.Items, _ = r.getOrderItems(ctx, o.ID)
	return &o, nil
}

func (r *PostgresBuyerRepository) getOrderItems(ctx context.Context, orderID string) ([]domain.BuyerOrderItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, order_id::text, COALESCE(product_id::text, ''), product_source,
		       COALESCE(product_name, ''), COALESCE(seller_id::text, ''),
		       quantity, unit, unit_price, subtotal, COALESCE(media_url, '')
		FROM buyer_order_items
		WHERE order_id = $1::uuid
	`, orderID)
	if err != nil {
		return []domain.BuyerOrderItem{}, err
	}
	defer rows.Close()

	var items []domain.BuyerOrderItem
	for rows.Next() {
		var it domain.BuyerOrderItem
		if err := rows.Scan(
			&it.ID, &it.OrderID, &it.ProductID, &it.ProductSource,
			&it.ProductName, &it.SellerID, &it.Quantity, &it.Unit,
			&it.UnitPrice, &it.Subtotal, &it.MediaURL,
		); err == nil {
			items = append(items, it)
		}
	}
	return items, nil
}

func (r *PostgresBuyerRepository) UpdateBuyerOrderStatus(ctx context.Context, order *domain.BuyerOrder) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE buyer_orders
		SET status = $1, confirmed_receipt_at = $2, cancelled_at = $3, updated_at = NOW()
		WHERE id = $4::uuid
	`, order.Status, order.ConfirmedReceiptAt, order.CancelledAt, order.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrBuyerOrderNotFound
	}
	return nil
}

var _ = geospatial.CalculateHaversineDistance
