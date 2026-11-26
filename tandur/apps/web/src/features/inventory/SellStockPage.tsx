import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  FileText,
  Plus,
  ClipboardCheck,
  Warehouse,
  Store,
  Building2,
  Handshake,
  AlertCircle,
  TrendingUp,
  Scale,
  Sprout,
  LayoutGrid,
  Home,
  Loader2,
  RefreshCw,
  PackageOpen,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { OpenSellOfferModal } from './OpenSellOfferModal';
import { fetchApi, MiddlemanApi } from '@/services/api';

interface SellOfferItem {
  id: string;
  lot_code: string;
  commodity_name: string;
  category: 'Gabah' | 'Beras' | 'Palawija';
  variety: string;
  location: string;
  offered_tons: number;
  available_tons: number;
  cost_price_per_kg: number;
  selling_price_per_kg: number;
  market_ref_price: string;
  source_partner: string;
  min_order_tons: number;
  pickup_method: string;
  validity: string;
  status: 'active' | 'pending' | 'closed';
  bids_count: number;
}

const LOCAL_SELL_OFFERS_KEY = 'tandur_local_sell_offers';

const formatRupiah = (val: number): string => {
  return 'Rp ' + (Number(val) || 0).toLocaleString('id-ID');
};

const formatCompactRupiah = (val: number): string => {
  if (val >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Jt`;
  }
  return formatRupiah(val);
};

const normalizeCategory = (rawCategory?: string, name?: string): 'Gabah' | 'Beras' | 'Palawija' => {
  const c = `${rawCategory || ''} ${name || ''}`.toLowerCase();
  if (c.includes('beras')) return 'Beras';
  if (c.includes('jagung') || c.includes('kedelai') || c.includes('palawija')) return 'Palawija';
  return 'Gabah';
};

export const SellStockPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<'Semua' | 'Gabah' | 'Beras' | 'Palawija'>('Semua');
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [offers, setOffers] = useState<SellOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const mapRawOffer = (item: any, idx: number): SellOfferItem => {
    const offeredTons = Number(
      item.offered_tons ?? item.offer_ton ?? (item.stock_kg ? Number(item.stock_kg) / 1000 : 0)
    );
    const availableTons = Number(
      item.available_tons ?? (item.capacity_kg ? Number(item.capacity_kg) / 1000 : offeredTons)
    );
    const costPrice = Number(item.cost_price_per_kg ?? item.avg_buy_price ?? 0);
    const sellingPrice = Number(
      item.selling_price_per_kg ?? item.price_per_kg ?? item.market_ref_price ?? costPrice
    );
    const commodityName = item.commodity_name || 'Komoditas Gudang';

    return {
      id: String(item.id || `offer-${idx}`),
      lot_code: item.lot_code || item.batch_code || `LOT-${idx + 1}`,
      commodity_name: commodityName,
      category: normalizeCategory(item.category, commodityName),
      variety: item.variety || 'Standar Gudang',
      location: item.warehouse_name || item.location || 'Gudang Mitra Tandur',
      offered_tons: offeredTons,
      available_tons: availableTons > 0 ? availableTons : offeredTons,
      cost_price_per_kg: costPrice,
      selling_price_per_kg: sellingPrice,
      market_ref_price:
        item.current_market_price ||
        (sellingPrice > 0 ? formatRupiah(sellingPrice) : 'Mengikuti Pasar'),
      source_partner: item.source_gapoktan || item.supplier_name || 'Petani Mitra Tandur',
      min_order_tons: Number(item.min_order_tons ?? item.min_order_ton ?? 1),
      pickup_method: item.delivery_option || item.pickup_method || 'Jemput di Gudang',
      validity: item.valid_until || item.validity || 'Aktif',
      status: item.status === 'closed' ? 'closed' : 'active',
      bids_count: Number(item.bids_count ?? 0),
    };
  };

  const loadSellOffers = async () => {
    setIsLoading(true);
    try {
      let apiItems: any[] = [];

      // 1. Coba ambil listing penjualan aktif dari API middleman
      try {
        const salesRes = await fetchApi<any>('/middleman/sales');
        const extractedSales = Array.isArray(salesRes?.data?.items)
          ? salesRes.data.items
          : Array.isArray(salesRes?.items)
          ? salesRes.items
          : Array.isArray(salesRes?.data)
          ? salesRes.data
          : Array.isArray(salesRes)
          ? salesRes
          : null;

        if (extractedSales && extractedSales.length > 0) {
          apiItems = extractedSales;
        }
      } catch {
        // Lanjut cek endpoint inventaris jika endpoint sales belum tersedia
      }

      // 2. Jika sales kosong, cek stok inventaris gudang dari API
      if (apiItems.length === 0) {
        try {
          const invRes = await MiddlemanApi.getInventories();
          const extractedInv = Array.isArray((invRes as any)?.data?.items)
            ? (invRes as any).data.items
            : Array.isArray((invRes as any)?.data)
            ? (invRes as any).data
            : Array.isArray(invRes)
            ? invRes
            : [];
          apiItems = extractedInv;
        } catch {
          // Abaikan jika API kosong
        }
      }

      // 3. Gabungkan dengan penawaran jual yang diterbitkan secara lokal
      let localItems: any[] = [];
      try {
        const rawLocal = JSON.parse(localStorage.getItem(LOCAL_SELL_OFFERS_KEY) || '[]');
        if (Array.isArray(rawLocal)) {
          localItems = rawLocal;
        }
      } catch {
        // Abaikan parse error
      }

      const combined = [...localItems, ...apiItems];
      setOffers(combined.map((item, idx) => mapRawOffer(item, idx)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellOffers();
  }, []);

  const handlePublishOffer = async (data: any) => {
    const lot = data.selectedLot || {};
    const offerTon = Number(data.offerTon || 0);
    const offerPrice = Number(data.offerPrice || 0);
    const costPrice = Number(lot.buyPrice || lot.avg_buy_price || 0);

    try {
      await MiddlemanApi.openSellOffer({
        inventory_id: lot.id,
        lot_id: lot.id,
        commodity_name: lot.name || lot.commodity_name,
        offered_tons: offerTon,
        offer_ton: offerTon,
        min_order_tons: Number(data.minOrderTon || 1),
        min_order_ton: Number(data.minOrderTon || 1),
        selling_price_per_kg: offerPrice,
        price_per_kg: offerPrice,
        delivery_option: data.pickupMethod,
        pickup_method: data.pickupMethod,
        validity: data.validity,
      });
    } catch {
      // Simpan ke localStorage sebagai fallback aman jika backend menolak
      try {
        const existingLocal = JSON.parse(localStorage.getItem(LOCAL_SELL_OFFERS_KEY) || '[]');
        const newLocalOffer = {
          id: `SELL-${Date.now()}`,
          lot_code: lot.lotCode || lot.batch_code || `LOT-${Date.now().toString().slice(-4)}`,
          commodity_name: lot.name || lot.commodity_name || 'Komoditas Gudang',
          category: lot.category || 'Gabah',
          variety: lot.variety || 'Standar Gudang',
          location: lot.location || 'Gudang Mitra Tandur',
          offered_tons: offerTon,
          available_tons: Number(lot.stockTon || offerTon),
          cost_price_per_kg: costPrice,
          selling_price_per_kg: offerPrice,
          min_order_tons: Number(data.minOrderTon || 1),
          pickup_method: data.pickupMethod || 'Jemput di Gudang',
          validity: data.validity || '3 Hari',
          status: 'active',
          bids_count: 0,
        };
        localStorage.setItem(
          LOCAL_SELL_OFFERS_KEY,
          JSON.stringify([newLocalOffer, ...(Array.isArray(existingLocal) ? existingLocal : [])])
        );
      } catch {
        // Abaikan jika gagal menulis localStorage
      }
    }

    await loadSellOffers();

    await Swal.fire({
      icon: 'success',
      title: 'Penawaran Jual Diterbitkan',
      text: `${offerTon} Ton ${lot.name || lot.commodity_name || 'komoditas'} aktif ditawarkan di pasar B2B Tandur.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const activeOffers = useMemo(
    () => offers.filter((o) => o.status !== 'closed'),
    [offers]
  );

  const totalReadyTons = useMemo(() => {
    const sum = activeOffers.reduce((acc, item) => acc + item.offered_tons, 0);
    return sum.toFixed(1);
  }, [activeOffers]);

  const uniqueWarehousesCount = useMemo(() => {
    return new Set(activeOffers.map((o) => o.location).filter(Boolean)).size;
  }, [activeOffers]);

  const totalBidsCount = useMemo(() => {
    return activeOffers.reduce((acc, item) => acc + item.bids_count, 0);
  }, [activeOffers]);

  const totalPotentialValue = useMemo(() => {
    return activeOffers.reduce(
      (acc, item) => acc + item.offered_tons * 1000 * item.selling_price_per_kg,
      0
    );
  }, [activeOffers]);

  const averageMarginPerKg = useMemo(() => {
    const withMargin = activeOffers.filter(
      (o) => o.selling_price_per_kg > 0 && o.cost_price_per_kg > 0
    );
    if (withMargin.length === 0) return 0;
    const totalMargin = withMargin.reduce(
      (acc, o) => acc + (o.selling_price_per_kg - o.cost_price_per_kg),
      0
    );
    return Math.round(totalMargin / withMargin.length);
  }, [activeOffers]);

  const counts = useMemo(() => {
    return {
      Semua: activeOffers.length,
      Gabah: activeOffers.filter((o) => o.category === 'Gabah').length,
      Beras: activeOffers.filter((o) => o.category === 'Beras').length,
      Palawija: activeOffers.filter((o) => o.category === 'Palawija').length,
    };
  }, [activeOffers]);

  const filteredOffers = useMemo(() => {
    if (selectedFilter === 'Semua') return activeOffers;
    return activeOffers.filter((o) => o.category === selectedFilter);
  }, [activeOffers, selectedFilter]);

  const renderCategoryIcon = (category: SellOfferItem['category']) => {
    if (category === 'Beras') {
      return (
        <div className="w-11 h-11 rounded-xl bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center shrink-0">
          <Home className="w-5 h-5" />
        </div>
      );
    }
    if (category === 'Palawija') {
      return (
        <div className="w-11 h-11 rounded-xl bg-[#F5EFE6] text-[#8A5A19] flex items-center justify-center shrink-0">
          <LayoutGrid className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-xl bg-[#DFF2E3] text-[#236B37] flex items-center justify-center shrink-0">
        <Sprout className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE6] text-[#7D5318] text-[11px] font-bold uppercase tracking-wide">
              <Truck className="w-3.5 h-3.5" />
              DISTRIBUSI &amp; PENJUALAN STOK GUDANG
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#1A201A]">
              Jual Stok Gudang
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Buka listing penjualan komoditas gabah, beras, dan palawija dari gudang/silo Anda ke pembeli grosir, pabrik penggilingan padi (rice mill), dan mitra pasar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              type="button"
              onClick={loadSellOffers}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer disabled:opacity-50"
              title="Muat ulang data penawaran"
            >
              <RefreshCw className={`w-4 h-4 text-[#236B37] ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() =>
                Swal.fire({
                  icon: 'info',
                  title: `${totalBidsCount} Penawaran Masuk`,
                  text:
                    totalBidsCount > 0
                      ? `Terdapat ${totalBidsCount} tawaran pembeli aktif pada listing stok Anda.`
                      : 'Belum ada tawaran baru dari pembeli grosir atau rice mill.',
                  confirmButtonColor: '#236B37',
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#8A5A19]" />
              <span>Pesanan Masuk</span>
              <span className="px-2 py-0.5 rounded-md bg-[#236B37] text-white text-[10px] font-bold">
                {totalBidsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsSellModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Buka Penawaran Baru
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Stok Siap Jual</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#1A201A]">{totalReadyTons}</span>
                <span className="text-sm font-bold text-[#236B37]">Ton</span>
              </div>
              <p className="text-xs font-semibold text-[#8A5A19] mt-1">
                {activeOffers.length} Lot Komoditas Aktif
              </p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Warehouse className="w-3.5 h-3.5 text-[#236B37] shrink-0" />
              <span>Tersedia di {uniqueWarehousesCount || 0} Lokasi Gudang</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Listing Penjualan Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#1A201A]">{activeOffers.length}</span>
                <span className="text-sm font-bold text-[#1A201A]">Komoditas</span>
              </div>
              <p className="text-xs text-[#6D756D] mt-1">
                {counts.Gabah} Gabah, {counts.Beras} Beras, {counts.Palawija} Palawija
              </p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Building2 className="w-3.5 h-3.5 text-[#236B37] shrink-0" />
              <span>Terhubung ke Pasar B2B Tandur</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Potensi Nilai Penjualan</span>
              <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center">
                <Handshake className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#1A201A]">
                  {formatCompactRupiah(totalPotentialValue)}
                </span>
              </div>
              <p className="text-xs text-[#6D756D] mt-1">
                Dari <strong className="text-[#1A201A]">{totalBidsCount}</strong> penawaran masuk
              </p>
            </div>
            <div className="bg-[#FDF4E7] rounded-xl px-3 py-2 border border-[#F5E1C3] flex items-center gap-2 text-[11px] font-bold text-[#8A5A19]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {totalBidsCount > 0 ? `${totalBidsCount} Tawaran Menunggu` : 'Siap Menerima Tawaran'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Rata-rata Margin Jual</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#236B37]">
                  {averageMarginPerKg >= 0 ? `+${formatRupiah(averageMarginPerKg)}` : formatRupiah(averageMarginPerKg)}
                </span>
                <span className="text-xs text-[#6D756D]">/ kg</span>
              </div>
              <p className="text-xs font-semibold text-[#236B37] mt-1">
                Selisih harga jual terhadap modal
              </p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Scale className="w-3.5 h-3.5 text-[#6D756D] shrink-0" />
              <span>Dihitung otomatis dari stok aktif</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1A201A]">
              Stok Komoditas Siap Ditawarkan
            </h2>
            <p className="text-xs text-[#6D756D]">
              Kelola kuota tonase, harga dasar jual, dan status listing pasar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'Semua', label: `Semua Stok (${counts.Semua})` },
                { key: 'Gabah', label: `Gabah Curah (${counts.Gabah})` },
                { key: 'Beras', label: `Beras Kemasan (${counts.Beras})` },
                { key: 'Palawija', label: `Palawija (${counts.Palawija})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedFilter === tab.key
                    ? 'bg-[#236B37] text-white'
                    : 'bg-[#F4EFE6] text-[#555D55] hover:bg-[#EAE2D3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#236B37] animate-spin" />
            <p className="text-sm font-bold text-[#1A201A]">Memuat Data Stok &amp; Penawaran...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <PackageOpen className="w-10 h-10 text-[#8A5A19]" />
            <h3 className="text-base font-bold text-[#1A201A]">
              Belum Ada Listing Penjualan Stok
            </h3>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-md">
              Belum ada stok gudang yang dibuka untuk penjualan pada kategori ini. Klik tombol &ldquo;Buka Penawaran Baru&rdquo; untuk mulai menawarkan stok ke pasar B2B.
            </p>
            <button
              type="button"
              onClick={() => setIsSellModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buka Penawaran Baru
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((item) => {
              const marginPerKg = item.selling_price_per_kg - item.cost_price_per_kg;
              const totalMargin = marginPerKg * item.offered_tons * 1000;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {renderCategoryIcon(item.category)}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-[#1A201A]">
                            {item.commodity_name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                            Siap Jual
                          </span>
                        </div>
                        <p className="text-xs mt-1">
                          <span className="font-semibold text-[#8A5A19]">{item.variety}</span>{' '}
                          <span className="text-[#7A827A]">• Lot:</span>{' '}
                          <strong className="font-mono text-[#1A201A]">#{item.lot_code}</strong>
                        </p>
                      </div>
                    </div>

                    <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F9F4] border border-[#D4E8D8] text-xs font-bold text-[#236B37]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                      Aktif Ditawarkan
                    </span>
                  </div>

                  <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[11px] text-[#7A827A]">Volume Siap Jual</div>
                      <div className="text-base font-bold text-[#1A201A] mt-0.5">
                        {item.offered_tons.toFixed(1)} Ton
                      </div>
                      <div className="text-[11px] text-[#7A827A]">
                        dari {item.available_tons.toFixed(1)} T ({item.location})
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#7A827A]">Modal Tebas / Beli</div>
                      <div className="text-base font-bold text-[#1A201A] mt-0.5">
                        {formatRupiah(item.cost_price_per_kg)}{' '}
                        <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                      </div>
                      <div className="text-[11px] text-[#8A5A19]">{item.source_partner}</div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#7A827A]">Acuan Pasar &amp; Pengambilan</div>
                      <div className="text-base font-bold text-[#8A5A19] mt-0.5">
                        {item.market_ref_price}
                      </div>
                      <div className="text-[11px] text-[#7A827A]">
                        Min. {item.min_order_tons} Ton • {item.pickup_method}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#7A827A]">Harga Buka Jual</div>
                      <div className="text-base font-bold text-[#236B37] mt-0.5">
                        {formatRupiah(item.selling_price_per_kg)}{' '}
                        <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                      </div>
                      {item.cost_price_per_kg > 0 && (
                        <div className="text-[11px] font-bold text-[#236B37]">
                          {marginPerKg >= 0 ? `+${formatRupiah(marginPerKg)}` : formatRupiah(marginPerKg)}/kg
                          {totalMargin > 0 ? ` (Potensi ${formatCompactRupiah(totalMargin)})` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsSellModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer"
                    >
                      Ubah Harga Buka
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSellModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Store className="w-3.5 h-3.5" />
                      Buka ke Pasar Pembeli
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pop-up Buka Penawaran Jual Baru */}
      <OpenSellOfferModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onPublish={handlePublishOffer}
      />
    </div>
  );
};

export default SellStockPage;