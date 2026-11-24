-- Rollback Migration: 000016_create_middleman_inventory_sales_and_dashboard.down.sql

DROP TABLE IF EXISTS middleman_sales_bids CASCADE;
DROP TABLE IF EXISTS middleman_sales_listings CASCADE;
DROP TABLE IF EXISTS middleman_inventory_mutations CASCADE;
DROP TABLE IF EXISTS middleman_inventories CASCADE;
