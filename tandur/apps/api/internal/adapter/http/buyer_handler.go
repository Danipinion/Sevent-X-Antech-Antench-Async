package http

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
)

type BuyerHandler struct {
	buyerService *application.BuyerService
}

func NewBuyerHandler(buyerService *application.BuyerService) *BuyerHandler {
	return &BuyerHandler{buyerService: buyerService}
}

func extractClaims(c fiber.Ctx) *application.JWTClaims {
	if claims, ok := c.Locals("claims").(*application.JWTClaims); ok {
		return claims
	}
	return nil
}

// -----------------------------------------------------------------------------
// 1. Eksplorasi Katalog & Beranda Pembeli
// -----------------------------------------------------------------------------

// ListCategories menangani GET /api/v1/categories
func (h *BuyerHandler) ListCategories(c fiber.Ctx) error {
	if h.buyerService == nil {
		return RespondError(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Layanan katalog pembeli tidak tersedia")
	}
	categories, err := h.buyerService.ListCategories(c.Context())
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}
	return RespondSuccess(c, fiber.StatusOK, "Daftar kategori komoditas berhasil diambil", categories)
}

// ListProducts menangani GET /api/v1/products
func (h *BuyerHandler) ListProducts(c fiber.Ctx) error {
	if h.buyerService == nil {
		return RespondError(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Layanan katalog pembeli tidak tersedia")
	}

	claims := extractClaims(c)
	filter := domain.BuyerProductFilter{
		CategoryID: c.Query("category_id"),
		Search:     c.Query("search"),
		Source:     c.Query("source"),
		RadiusKm:   domain.MaxBuyerRadiusKm,
		Page:       1,
		Limit:      20,
	}

	if latStr := strings.TrimSpace(c.Query("lat")); latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			filter.Latitude = &lat
		}
	}
	if lngStr := strings.TrimSpace(c.Query("lng")); lngStr != "" {
		if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
			filter.Longitude = &lng
		}
	}
	if radStr := strings.TrimSpace(c.Query("radius")); radStr != "" {
		if r, err := strconv.ParseFloat(radStr, 64); err == nil && r > 0 {
			filter.RadiusKm = r
		}
	}
	if preStr := strings.TrimSpace(c.Query("is_preorder")); preStr != "" {
		b := strings.EqualFold(preStr, "true") || preStr == "1"
		filter.IsPreorder = &b
	}
	if p, err := strconv.Atoi(c.Query("page", "1")); err == nil && p > 0 {
		filter.Page = p
	}
	if l, err := strconv.Atoi(c.Query("limit", "20")); err == nil && l > 0 && l <= 100 {
		filter.Limit = l
	}

	result, err := h.buyerService.ListProducts(c.Context(), claims, filter)
	if err != nil {
		if errors.Is(err, domain.ErrFarmerSourceForbidden) {
			return RespondError(c, fiber.StatusForbidden, "FARMER_SOURCE_FORBIDDEN", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccessWithPagination(
		c,
		fiber.StatusOK,
		"Katalog produk lokal berhasil diambil",
		result.Items,
		NewPaginationMeta(result.Page, result.Limit, result.TotalItems),
	)
}

// ListPopularProducts menangani GET /api/v1/products/popular
func (h *BuyerHandler) ListPopularProducts(c fiber.Ctx) error {
	if h.buyerService == nil {
		return RespondError(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Layanan katalog pembeli tidak tersedia")
	}

	claims := extractClaims(c)
	filter := domain.BuyerProductFilter{
		City:     c.Query("city"),
		RadiusKm: domain.MaxBuyerRadiusKm,
		Limit:    10,
	}
	if latStr := strings.TrimSpace(c.Query("lat")); latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			filter.Latitude = &lat
		}
	}
	if lngStr := strings.TrimSpace(c.Query("lng")); lngStr != "" {
		if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
			filter.Longitude = &lng
		}
	}
	if l, err := strconv.Atoi(c.Query("limit", "10")); err == nil && l > 0 && l <= 50 {
		filter.Limit = l
	}

	items, err := h.buyerService.ListPopularProducts(c.Context(), claims, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}
	return RespondSuccess(c, fiber.StatusOK, "Daftar produk paling banyak dibeli berhasil diambil", items)
}

// GetProductDetail menangani GET /api/v1/products/:id
func (h *BuyerHandler) GetProductDetail(c fiber.Ctx) error {
	if h.buyerService == nil {
		return RespondError(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Layanan katalog pembeli tidak tersedia")
	}

	productID := c.Params("id")
	claims := extractClaims(c)
	sourceHint := c.Query("source")

	var lat, lng *float64
	if latStr := strings.TrimSpace(c.Query("lat")); latStr != "" {
		if v, err := strconv.ParseFloat(latStr, 64); err == nil {
			lat = &v
		}
	}
	if lngStr := strings.TrimSpace(c.Query("lng")); lngStr != "" {
		if v, err := strconv.ParseFloat(lngStr, 64); err == nil {
			lng = &v
		}
	}

	product, err := h.buyerService.GetProductDetail(c.Context(), claims, productID, sourceHint, lat, lng)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrFarmerSourceForbidden):
			return RespondError(c, fiber.StatusForbidden, "FARMER_SOURCE_FORBIDDEN", err.Error())
		case errors.Is(err, domain.ErrProductNotFound):
			return RespondError(c, fiber.StatusNotFound, "PRODUCT_NOT_FOUND", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail produk berhasil diambil", product)
}

// -----------------------------------------------------------------------------
// 2. Keranjang Belanja & Konsolidasi Stok
// -----------------------------------------------------------------------------

// GetCart menangani GET /api/v1/cart
func (h *BuyerHandler) GetCart(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	cart, err := h.buyerService.GetCart(c.Context(), userID)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}
	return RespondSuccess(c, fiber.StatusOK, "Isi keranjang belanja berhasil diambil", cart)
}

// AddCartItem menangani POST /api/v1/cart/items
func (h *BuyerHandler) AddCartItem(c fiber.Ctx) error {
	claims := extractClaims(c)
	if claims == nil || claims.UserID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	var input domain.AddCartItemInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_REQUEST", "Format payload tidak valid")
	}

	item, err := h.buyerService.AddToCart(c.Context(), claims, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrFarmerSourceForbidden):
			return RespondError(c, fiber.StatusForbidden, "FARMER_SOURCE_FORBIDDEN", err.Error())
		case errors.Is(err, domain.ErrProductNotFound):
			return RespondError(c, fiber.StatusNotFound, "PRODUCT_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrInvalidQuantity):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_QUANTITY", err.Error())
		case errors.Is(err, domain.ErrStockExceeded):
			return RespondError(c, fiber.StatusBadRequest, "STOCK_EXCEEDED", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusCreated, "Produk berhasil ditambahkan ke keranjang belanja", item)
}

// UpdateCartItem menangani PATCH /api/v1/cart/items/:item_id
func (h *BuyerHandler) UpdateCartItem(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	itemID := c.Params("item_id")
	var input domain.UpdateCartItemInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_REQUEST", "Format payload tidak valid")
	}

	item, err := h.buyerService.UpdateCartItem(c.Context(), userID, itemID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrCartItemNotFound):
			return RespondError(c, fiber.StatusNotFound, "CART_ITEM_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrInvalidQuantity):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_QUANTITY", err.Error())
		case errors.Is(err, domain.ErrStockExceeded):
			return RespondError(c, fiber.StatusBadRequest, "STOCK_EXCEEDED", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Kuantitas item keranjang berhasil diperbarui", item)
}

// DeleteCartItem menangani DELETE /api/v1/cart/items/:item_id
func (h *BuyerHandler) DeleteCartItem(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	itemID := c.Params("item_id")
	if err := h.buyerService.DeleteCartItem(c.Context(), userID, itemID); err != nil {
		if errors.Is(err, domain.ErrCartItemNotFound) {
			return RespondError(c, fiber.StatusNotFound, "CART_ITEM_NOT_FOUND", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Item berhasil dihapus dari keranjang belanja", nil)
}

// -----------------------------------------------------------------------------
// 3. Alamat Utama, Checkout & Transaksi Cash on Pickup
// -----------------------------------------------------------------------------

// GetPrimaryAddress menangani GET /api/v1/addresses/primary
func (h *BuyerHandler) GetPrimaryAddress(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	addr, err := h.buyerService.GetPrimaryAddress(c.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrPrimaryAddressRequired) || errors.Is(err, domain.ErrUserNotFound) {
			return RespondError(c, fiber.StatusNotFound, "PRIMARY_ADDRESS_NOT_FOUND", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Alamat utama pembeli berhasil diambil", addr)
}

// CheckoutSummary menangani POST /api/v1/orders/checkout-summary
func (h *BuyerHandler) CheckoutSummary(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	var input domain.CheckoutSummaryInput
	_ = c.Bind().Body(&input)

	summary, err := h.buyerService.CalculateCheckoutSummary(c.Context(), userID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrCartEmpty):
			return RespondError(c, fiber.StatusBadRequest, "CART_EMPTY", err.Error())
		case errors.Is(err, domain.ErrStockExceeded):
			return RespondError(c, fiber.StatusBadRequest, "STOCK_EXCEEDED", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Ringkasan pembayaran checkout berhasil dihitung", summary)
}

// CreateBuyerOrder menangani POST /api/v1/orders
func (h *BuyerHandler) CreateBuyerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	var input domain.CreateBuyerOrderInput
	_ = c.Bind().Body(&input)

	orders, err := h.buyerService.CreateOrders(c.Context(), userID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrCartEmpty):
			return RespondError(c, fiber.StatusBadRequest, "CART_EMPTY", err.Error())
		case errors.Is(err, domain.ErrStockExceeded):
			return RespondError(c, fiber.StatusBadRequest, "STOCK_EXCEEDED", err.Error())
		case errors.Is(err, domain.ErrExceedsMaxRadius):
			return RespondError(c, fiber.StatusBadRequest, "EXCEEDS_MAX_RADIUS", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	var totalCash float64
	for _, o := range orders {
		totalCash += o.TotalAmount
	}

	return RespondSuccess(c, fiber.StatusCreated, "Pesanan berhasil dibuat dengan metode Cash on Pickup", fiber.Map{
		"orders":          orders,
		"total_orders":    len(orders),
		"payment_method":  domain.PaymentMethodCashOnPickup,
		"cash_to_prepare": totalCash,
	})
}

// ListBuyerOrders menangani GET /api/v1/orders
func (h *BuyerHandler) ListBuyerOrders(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	status := c.Query("status")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	res, err := h.buyerService.ListBuyerOrders(c.Context(), userID, status, page, limit)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccessWithPagination(
		c,
		fiber.StatusOK,
		"Riwayat pesanan pembeli berhasil diambil",
		res.Items,
		NewPaginationMeta(res.Page, res.Limit, res.TotalItems),
	)
}

// GetBuyerOrderDetail menangani GET /api/v1/orders/:order_id
func (h *BuyerHandler) GetBuyerOrderDetail(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	orderID := c.Params("order_id")
	order, err := h.buyerService.GetBuyerOrderDetail(c.Context(), userID, orderID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrBuyerOrderNotFound):
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrForbiddenBuyerOrderAccess):
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail pesanan pembeli berhasil diambil", order)
}

// CancelBuyerOrder menangani PATCH /api/v1/orders/:order_id/cancel
func (h *BuyerHandler) CancelBuyerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	orderID := c.Params("order_id")
	order, err := h.buyerService.CancelBuyerOrder(c.Context(), userID, orderID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrBuyerOrderNotFound):
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrForbiddenBuyerOrderAccess):
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN", err.Error())
		case errors.Is(err, domain.ErrBuyerOrderCannotBeCancel):
			return RespondError(c, fiber.StatusBadRequest, "ORDER_CANNOT_BE_CANCELLED", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Pesanan berhasil dibatalkan dan stok telah dikembalikan", order)
}

// ConfirmBuyerOrderReceipt menangani PATCH /api/v1/orders/:order_id/confirm-receipt
func (h *BuyerHandler) ConfirmBuyerOrderReceipt(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	orderID := c.Params("order_id")
	order, err := h.buyerService.ConfirmOrderReceipt(c.Context(), userID, orderID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrBuyerOrderNotFound):
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrForbiddenBuyerOrderAccess):
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN", err.Error())
		case errors.Is(err, domain.ErrBuyerOrderCannotBeConfirm):
			return RespondError(c, fiber.StatusBadRequest, "ORDER_CANNOT_BE_CONFIRMED", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Penerimaan komoditas dan pembayaran tunai (Cash on Pickup) berhasil dikonfirmasi", order)
}
