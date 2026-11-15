CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_user_locations_user_id
ON user_locations(user_id);

CREATE INDEX idx_user_locations_geo
ON user_locations USING GIST(location);

CREATE INDEX idx_farmer_listings_farmer_id
ON farmer_listings(farmer_id);

CREATE INDEX idx_farmer_listings_commodity_id
ON farmer_listings(commodity_id);

CREATE INDEX idx_farmer_listings_status
ON farmer_listings(status);

CREATE INDEX idx_farmer_listings_geo
ON farmer_listings USING GIST(location);

CREATE INDEX idx_farmer_purchases_listing_id
ON farmer_purchases(listing_id);

CREATE INDEX idx_farmer_purchases_middleman_id
ON farmer_purchases(middleman_id);

CREATE INDEX idx_farmer_purchases_status
ON farmer_purchases(status);

CREATE INDEX idx_inventory_middleman_id
ON inventory(middleman_id);

CREATE INDEX idx_inventory_commodity_id
ON inventory(commodity_id);

CREATE INDEX idx_inventory_movements_inventory_id
ON inventory_movements(inventory_id);

CREATE INDEX idx_inventory_movements_created_at
ON inventory_movements(created_at);

CREATE INDEX idx_buyer_orders_buyer_id
ON buyer_orders(buyer_id);

CREATE INDEX idx_buyer_orders_status
ON buyer_orders(status);

CREATE INDEX idx_buyer_order_items_order_id
ON buyer_order_items(order_id);

CREATE INDEX idx_order_suborders_order_id
ON order_suborders(order_id);

CREATE INDEX idx_order_suborders_middleman_id
ON order_suborders(middleman_id);

CREATE INDEX idx_market_prices_commodity_recorded
ON market_prices(commodity_id, recorded_at DESC);

CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
ON notifications(user_id)
WHERE is_read = FALSE;

