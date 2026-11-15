-- name: ListInventoriesByCommodity :many
SELECT
    i.id,
    i.commodity_id,
    c.name as commodity_name,
    i.owner_id,
    u.name as owner_name,
    i.quantity,
    i.unit,
    i.quality_grade,
    i.location_name,
    ST_X(i.geom) as longitude,
    ST_Y(i.geom) as latitude,
    i.harvest_date,
    i.updated_at
FROM inventories i
JOIN commodities c ON i.commodity_id = c.id
JOIN users u ON i.owner_id = u.id
WHERE i.commodity_id = $1
ORDER BY i.harvest_date DESC;

-- name: FindNearbyInventories :many
-- Finds inventories within radius_meters using PostGIS ST_DWithin
SELECT
    id, commodity_id, owner_id, quantity, unit, quality_grade, location_name,
    ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
FROM inventories
WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
ORDER BY distance_meters ASC;

