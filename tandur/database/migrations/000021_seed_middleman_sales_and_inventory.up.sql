-- Migration 000021: Seed inventaris gudang dan listing penjualan stok tengkulak (Haji Supardi)
-- Memastikan etalase pasar pembeli (marketplace buyer) menampilkan komoditas aktif

DO $$
BEGIN
    -- 1. Pastikan lokasi utama Haji Supardi terdaftar di Demak
    UPDATE user_locations
    SET label = 'Gudang Utama Demak',
        address = 'Jl. Raya Demak - Kudus Km. 4, Karangawen',
        village = 'Karangawen',
        district = 'Karangawen',
        city = 'Kabupaten Demak',
        province = 'Jawa Tengah',
        location = ST_SetSRID(ST_MakePoint(110.6385, -6.8944), 4326)::geography,
        is_primary = TRUE,
        updated_at = NOW()
    WHERE user_id = 'b3618e70-e4dc-48e8-9189-48c824a42f98';

    IF NOT FOUND THEN
        INSERT INTO user_locations (
            id, user_id, label, address, village, district, city, province, location, is_primary, created_at, updated_at
        ) VALUES (
            '4c7f555e-66bb-4a13-85c9-e0072059375e',
            'b3618e70-e4dc-48e8-9189-48c824a42f98',
            'Gudang Utama Demak',
            'Jl. Raya Demak - Kudus Km. 4, Karangawen',
            'Karangawen',
            'Karangawen',
            'Kabupaten Demak',
            'Jawa Tengah',
            ST_SetSRID(ST_MakePoint(110.6385, -6.8944), 4326)::geography,
            TRUE,
            NOW(),
            NOW()
        );
    END IF;

    -- 2. Seed Inventaris Stok Gudang Tengkulak (middleman_inventories)
    INSERT INTO middleman_inventories (
        id,
        middleman_id,
        lot_code,
        commodity_id,
        commodity_name,
        category,
        variety,
        warehouse_name,
        warehouse_capacity_tons,
        total_weight_kg,
        total_weight_tons,
        average_buy_price,
        current_market_price,
        moisture_content,
        impurity_content,
        source_gapoktan,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES
    (
        'e1111111-1111-4111-a111-111111111111',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'LOT-DMK-2026-001',
        '27a56d2a-4f6f-4a7e-a0f9-7eb21774d685',
        'Beras Mentik Wangi',
        'Beras Berkualitas',
        'Mentik Wangi Organik',
        'Gudang Utama Demak',
        50.00,
        12000.00,
        12.00,
        12500.00,
        13800.00,
        12.50,
        0.80,
        'Gapoktan Sumber Makmur',
        'aman',
        'Kualitas premium siap kemas dan pasok grosir/retail',
        NOW(),
        NOW()
    ),
    (
        'e2222222-2222-4222-a222-222222222222',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'LOT-DMK-2026-002',
        '806931f2-c469-48c3-b5ee-7097fd078053',
        'Gabah Kering Giling (GKG)',
        'Padi Sawah',
        'Ciherang Super',
        'Gudang Utama Demak',
        60.00,
        25000.00,
        25.00,
        7200.00,
        7900.00,
        13.20,
        1.50,
        'Gapoktan Sumber Makmur',
        'aman',
        'Gabah siap giling ke Rice Mill rekanan',
        NOW(),
        NOW()
    ),
    (
        'e3333333-3333-4333-a333-333333333333',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'LOT-DMK-2026-003',
        'd338fe10-dd71-4fb4-affa-5e88d4b1817e',
        'Jagung Pipil Kering',
        'Palawija',
        'Bisi-18 Hibrida',
        'Gudang Utama Demak',
        40.00,
        18000.00,
        18.00,
        5200.00,
        5750.00,
        14.00,
        1.20,
        'Gapoktan Tani Mulya',
        'aman',
        'Standar pakan ternak dan industri olahan',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        total_weight_kg = EXCLUDED.total_weight_kg,
        total_weight_tons = EXCLUDED.total_weight_tons,
        average_buy_price = EXCLUDED.average_buy_price,
        current_market_price = EXCLUDED.current_market_price,
        status = 'aman',
        updated_at = NOW();

    -- 3. Seed Listing Penjualan Stok Gudang ke Pembeli (middleman_sales_listings)
    INSERT INTO middleman_sales_listings (
        id,
        middleman_id,
        inventory_id,
        lot_code,
        commodity_name,
        category,
        variety,
        offered_tons,
        min_order_tons,
        cost_price_per_kg,
        selling_price_per_kg,
        total_selling_value,
        target_margin_per_kg,
        total_target_margin,
        delivery_option,
        target_markets,
        valid_until,
        status,
        created_at,
        updated_at
    ) VALUES
    (
        'f1111111-1111-4111-b111-111111111111',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'e1111111-1111-4111-a111-111111111111',
        'LOT-DMK-2026-001',
        'Beras Mentik Wangi',
        'Beras Berkualitas',
        'Mentik Wangi Organik',
        8.00,
        0.05,
        12500.00,
        13800.00,
        110400000.00,
        1300.00,
        10400000.00,
        'warehouse_pickup',
        ARRAY['wholesaler', 'retail', 'restaurant'],
        CURRENT_DATE + INTERVAL '30 days',
        'active',
        NOW(),
        NOW()
    ),
    (
        'f2222222-2222-4222-b222-222222222222',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'e2222222-2222-4222-a222-222222222222',
        'LOT-DMK-2026-002',
        'Gabah Kering Giling (GKG)',
        'Padi Sawah',
        'Ciherang Super',
        15.00,
        0.50,
        7200.00,
        7900.00,
        118500000.00,
        700.00,
        10500000.00,
        'warehouse_pickup',
        ARRAY['rice_mill', 'wholesaler'],
        CURRENT_DATE + INTERVAL '30 days',
        'active',
        NOW(),
        NOW()
    ),
    (
        'f3333333-3333-4333-b333-333333333333',
        'b3618e70-e4dc-48e8-9189-48c824a42f98',
        'e3333333-3333-4333-a333-333333333333',
        'LOT-DMK-2026-003',
        'Jagung Pipil Kering',
        'Palawija',
        'Bisi-18 Hibrida',
        10.00,
        0.10,
        5200.00,
        5750.00,
        57500000.00,
        550.00,
        5500000.00,
        'warehouse_pickup',
        ARRAY['feed_mill', 'wholesaler'],
        CURRENT_DATE + INTERVAL '30 days',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        offered_tons = EXCLUDED.offered_tons,
        min_order_tons = EXCLUDED.min_order_tons,
        selling_price_per_kg = EXCLUDED.selling_price_per_kg,
        status = 'active',
        valid_until = CURRENT_DATE + INTERVAL '30 days',
        updated_at = NOW();

END $$;
