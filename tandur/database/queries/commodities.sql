-- name: GetCommodityByID :one
SELECT id, name, category, unit, base_price, current_market_price, created_at, updated_at
FROM commodities
WHERE id = $1 LIMIT 1;

-- name: ListCommodities :many
SELECT id, name, category, unit, base_price, current_market_price, created_at, updated_at
FROM commodities
ORDER BY name ASC;

-- name: CreateCommodity :one
INSERT INTO commodities (id, name, category, unit, base_price, current_market_price)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
