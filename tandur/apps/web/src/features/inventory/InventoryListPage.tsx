import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  Plus,
  Wallet,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Home,
  Package,
  Truck,
  FileSpreadsheet,
  ArrowUpDown,
  ShieldCheck,
  Loader2,
  RefreshCw,
  PackageOpen,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { InventoryDetailModal, InventoryItemDetail } from './InventoryDetailModal';
import { AddIncomingStockModal } from './AddIncomingStockModal';
import { fetchApi, MiddlemanApi } from '@/services/api';

interface ExtendedInventoryItem extends InventoryItemDetail {
  rawStockKg: number;
  rawCapacityKg: number;
  rawAvgBuyPrice: number;
  rawMarketRefPrice: number;
}

interface MutationLogItem {
  id: string;
  type: 'in' | 'out';
  title: string;
  partner: string;
  docRef: string;
  timeLabel: string;
  statusLabel: string;
}

const LOCAL_INVENTORY_KEY = 'tandur_local_inventories';
const LOCAL_MUTATIONS_KEY = 'tandur_local_inventory_mutations';

const formatCompactRupiah = (val: number): string => {
  if (val >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Jt`;
  }
  return 'Rp ' + (Number(val) || 0).toLocaleString('id-ID');
};

const normalizeCategory = (rawCat?: string, name?: string): 'Gabah' | 'Beras' | 'Palawija' => {
  const combined = `${rawCat || ''} ${name || ''}`.toLowerCase();
  if (combined.includes('beras')) return 'Beras';
  if (combined.includes('jagung') || combined.includes('kedelai') || combined.includes('palawija')) {
    return 'Palawija';
  }
  return 'Gabah';
};

export const InventoryListPage: React.FC = () => {
  const [items, setItems] = useState<ExtendedInventoryItem[]>([]);
  const [mutations, setMutations] = useState<MutationLogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Gabah' | 'Beras' | 'Palawija'>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ExtendedInventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const mapRawToDetail = (inv: any, idx: number): ExtendedInventoryItem => {
    const stockKg = Number(
      inv.stock_kg ?? inv.total_weight_kg ?? (inv.total_weight_tons ? Number(inv.total_weight_tons) * 1000 : 0)
    );
    const capacityKg = Number(
      inv.capacity_kg ?? (inv.warehouse_capacity_tons ? Number(inv.warehouse_capacity_tons) * 1000 : Math.max(stockKg, 20000))
    );
    const pct = capacityKg > 0 ? Math.min(100, Math.round((stockKg / capacityKg) * 1000) / 10) : 50;

    let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
    if (inv.status === 'kritis' || pct <= 15) {
      status = 'Kritis';
    } else if (inv.status === 'menipis' || pct <= 40) {
      status = 'Menipis';
    }

    const avgBuy = Number(inv.avg_buy_price ?? inv.average_buy_price ?? 0);
    const marketRef = Number(inv.market_ref_price ?? inv.current_market_price ?? avgBuy);
    const margin = marketRef - avgBuy;
    const commodityName = inv.commodity_name || 'Komoditas Gudang';
    const category = normalizeCategory(inv.category, commodityName);

    return {
      id: String(inv.id || `inv-${idx}`),
      batchId: inv.batch_code || inv.lot_code || `#BATCH-${idx + 1}`,
      name: commodityName,
      variety: inv.variety || inv.supplier_name || 'Standar Gudang',
      category,
      status,
      statusBadgeText:
        status === 'Aman' ? 'Aman / Optimal' : status === 'Menipis' ? 'Stok Menipis' : 'Stok Kritis',
      processingStatus: category === 'Beras' ? 'Siap Distribusi Pasar' : 'Tersimpan di Silo',
      totalStockTon: `${(stockKg / 1000).toFixed(1)} Ton`,
      totalStockKg: `${stockKg.toLocaleString('id-ID')} kg`,
      progressPercent: pct,
      location: inv.location || inv.warehouse_name || 'Gudang Mitra Tandur',
      occupancyText: `Okupansi ${pct}% • Kapasitas Maks ${(capacityKg / 1000).toFixed(1)} Ton`,
      avgBuyPrice: `Rp ${avgBuy.toLocaleString('id-ID')}`,
      buyPriceNote: 'Harga tertimbang masuk',
      marketRefPrice: `Rp ${marketRef.toLocaleString('id-ID')}`,
      marginBadge: `${margin >= 0 ? '+' : ''}Rp ${margin.toLocaleString('id-ID')}/kg margin`,
      marketUpdateNote: 'Acuan harga pasar terkini',
      moistureQuality: inv.moisture_level || (inv.moisture_content ? `Kadar Air ${inv.moisture_content}%` : 'Standar Kualitas Gudang'),
      calibrationNote: 'Tera Metrologi Digital Aktif',
      lastIncomingTime: inv.updated_at
        ? new Date(inv.updated_at).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'Tercatat Sistem',
      lastIncomingSource: inv.supplier_name || inv.source_gapoktan || 'Mitra Petani Tandur',
      rawStockKg: stockKg,
      rawCapacityKg: capacityKg,
      rawAvgBuyPrice: avgBuy,
      rawMarketRefPrice: marketRef,
    };
  };

  const loadAllInventoryData = async () => {
    setIsLoading(true);
    try {
      let apiList: any[] = [];
      try {
        const res = await MiddlemanApi.getInventories();
        const extracted = Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        apiList = extracted;
      } catch {
        // Fallback aman ke localStorage jika API gagal
      }

      let localList: any[] = [];
      try {
        const rawLocal = JSON.parse(localStorage.getItem(LOCAL_INVENTORY_KEY) || '[]');
        if (Array.isArray(rawLocal)) {
          localList = rawLocal;
        }
      } catch {
        // Abaikan parse error
      }

      const combined = [...localList, ...apiList];
      setItems(combined.map((inv, idx) => mapRawToDetail(inv, idx)));

      // Muat log mutasi keluar-masuk
      let apiMutations: MutationLogItem[] = [];
      try {
        const mutRes = await fetchApi<any>('/middleman/inventory/mutations?limit=5');
        const rawMuts = Array.isArray(mutRes?.data?.items)
          ? mutRes.data.items
          : Array.isArray(mutRes?.data)
          ? mutRes.data
          : Array.isArray(mutRes)
          ? mutRes
          : [];
        apiMutations = rawMuts.map((m: any, idx: number) => ({
          id: String(m.id || `mut-${idx}`),
          type: m.mutation_type === 'out' ? 'out' : 'in',
          title: `${m.mutation_type === 'out' ? '-' : '+'}${Number(m.quantity_tons || 0).toFixed(1)} Ton ${m.commodity_name || 'Komoditas'}`,
          partner: m.partner_name || 'Mitra Tandur',
          docRef: `Lot: ${m.lot_code || '-'}`,
          timeLabel: m.created_at
            ? new Date(m.created_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Baru saja',
          statusLabel: m.mutation_type === 'out' ? 'Distribusi Keluar' : 'Timbang Selesai',
        }));
      } catch {
        // Abaikan jika endpoint mutasi belum aktif
      }

      let localMutations: MutationLogItem[] = [];
      try {
        const rawLocalMuts = JSON.parse(localStorage.getItem(LOCAL_MUTATIONS_KEY) || '[]');
        if (Array.isArray(rawLocalMuts)) {
          localMutations = rawLocalMuts;
        }
      } catch {
        // Abaikan parse error
      }

      setMutations([...localMutations, ...apiMutations].slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  const handleSaveIncomingStock = async (formData: any) => {
    const stockKg = Math.round(Number(formData.tonnage || 0) * 1000);
    const buyPrice = Number(formData.buyPrice || 0);
    const marketRefPrice = Number(formData.marketRefPrice || buyPrice);
    const locationClean = String(formData.siloLocation || 'Gudang Utama').split(' (')[0];
    const batchCode = formData.batchCode || `LOT-${Date.now().toString().slice(-5)}`;
    const commodityName = formData.commodity || 'Komoditas Panen';
    const category = normalizeCategory('', commodityName);

    let savedFromApi = false;
    try {
      await MiddlemanApi.addIncomingStock({
        batch_code: batchCode,
        commodity_name: commodityName,
        category: category.toLowerCase(),
        variety: formData.variety || 'Standar Gudang',
        supplier_name: formData.supplier || 'Petani Mitra Tandur',
        source_gapoktan: formData.supplier || 'Petani Mitra Tandur',
        location: locationClean,
        warehouse_name: locationClean,
        stock_kg: stockKg,
        weight_kg: stockKg,
        capacity_kg: Math.max(stockKg, 20000),
        avg_buy_price: buyPrice,
        buy_price_per_kg: buyPrice,
        market_ref_price: marketRefPrice,
        market_price_per_kg: marketRefPrice,
      });
      savedFromApi = true;
    } catch {
      // Fallback ke penyimpanan lokal agar tetap tercatat
    }

    if (!savedFromApi) {
      try {
        const existingLocal = JSON.parse(localStorage.getItem(LOCAL_INVENTORY_KEY) || '[]');
        const newLocalRecord = {
          id: `inv-${Date.now()}`,
          batch_code: batchCode,
          commodity_name: commodityName,
          category,
          variety: formData.variety || formData.supplier || 'Standar Gudang',
          location: locationClean,
          stock_kg: stockKg,
          capacity_kg: Math.max(stockKg, 20000),
          avg_buy_price: buyPrice,
          market_ref_price: marketRefPrice,
          moisture_level: formData.yieldPercent
            ? `Rendemen Giling ${formData.yieldPercent}%`
            : 'Kadar Air Standar',
          supplier_name: formData.supplier || 'Petani Mitra Tandur',
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(
          LOCAL_INVENTORY_KEY,
          JSON.stringify([newLocalRecord, ...(Array.isArray(existingLocal) ? existingLocal : [])])
        );
      } catch {
        // Abaikan jika gagal menulis localStorage
      }
    }

    // Catat log mutasi masuk
    const newMutation: MutationLogItem = {
      id: `mut-${Date.now()}`,
      type: 'in',
      title: `+${Number(formData.tonnage || 0).toFixed(1)} Ton ${commodityName}`,
      partner: formData.supplier || 'Petani Mitra Tandur',
      docRef: `Batch: ${batchCode} • ${locationClean}`,
      timeLabel: formData.receivedTime || 'Baru saja',
      statusLabel: 'Timbang Selesai',
    };
    try {
      const existingMuts = JSON.parse(localStorage.getItem(LOCAL_MUTATIONS_KEY) || '[]');
      localStorage.setItem(
        LOCAL_MUTATIONS_KEY,
        JSON.stringify([newMutation, ...(Array.isArray(existingMuts) ? existingMuts : [])].slice(0, 10))
      );
    } catch {
      // Abaikan parse error
    }

    await loadAllInventoryData();

    await Swal.fire({
      icon: 'success',
      title: 'Stok Gudang Ditambahkan',
      text: `${formData.tonnage} Ton berhasil dicatat ke ${locationClean}.`,
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handleDeleteStock = async (id: string) => {
    try {
      await MiddlemanApi.deleteInventory(id);
    } catch {
      // Abaikan error API jika berasal dari penyimpanan lokal
    }

    try {
      const existingLocal = JSON.parse(localStorage.getItem(LOCAL_INVENTORY_KEY) || '[]');
      if (Array.isArray(existingLocal)) {
        localStorage.setItem(
          LOCAL_INVENTORY_KEY,
          JSON.stringify(existingLocal.filter((inv: any) => String(inv.id) !== String(id)))
        );
      }
    } catch {
      // Abaikan parse error
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItem(null);
    await Swal.fire({
      icon: 'success',
      title: 'Data Stok Dihapus',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // Perhitungan dinamis kartu ringkasan atas
  const summaryStats = useMemo(() => {
    const totalKg = items.reduce((acc, i) => acc + i.rawStockKg, 0);
    const totalCapacityKg = items.reduce((acc, i) => acc + i.rawCapacityKg, 0);
    const totalTons = (totalKg / 1000).toFixed(1);
    const occupancyPct =
      totalCapacityKg > 0 ? Math.min(100, (totalKg / totalCapacityKg) * 100) : 0;

    const totalEstimatedValue = items.reduce(
      (acc, i) => acc + i.rawStockKg * i.rawAvgBuyPrice,
      0
    );

    const availableCapacityKg = Math.max(0, totalCapacityKg - totalKg);
    const availableTons = (availableCapacityKg / 1000).toFixed(1);
    const availablePct =
      totalCapacityKg > 0 ? Math.min(100, (availableCapacityKg / totalCapacityKg) * 100) : 0;

    const alertItems = items.filter((i) => i.status === 'Menipis' || i.status === 'Kritis');
    const alertNames =
      alertItems.length > 0
        ? alertItems.map((a) => a.name).join(', ')
        : 'Semua komoditas dalam batas aman';

    return {
      totalKg,
      totalTons,
      occupancyPct,
      totalEstimatedValue,
      availableTons,
      availablePct,
      alertCount: alertItems.length,
      alertNames,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchSearch;
    });
  }, [items, selectedCategory, statusFilter, searchQuery]);

  const renderCategoryIcon = (category: InventoryItemDetail['category'], status: InventoryItemDetail['status']) => {
    if (status === 'Kritis') {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FCECEC] text-[#C93B3B] flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
      );
    }
    if (category === 'Beras') {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F5EFE6] text-[#8A5A19] flex items-center justify-center shrink-0">
          <Home className="w-4 h-4" />
        </div>
      );
    }
    if (category === 'Palawija') {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#9C651B] flex items-center justify-center shrink-0">
          <Package className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
        <LayoutGrid className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE6] text-[#7D5318] text-[11px] font-bold tracking-wide uppercase">
              <Warehouse className="w-3.5 h-3.5" />
              GUDANG UTAMA &amp; SILO PENAMPUNGAN
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1A201A] tracking-tight">
              Inventaris Stok Gudang
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Monitoring real-time kapasitas silo, tonase komoditas gabah, beras, dan palawija, serta pergerakan keluar-masuk gudang.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={loadAllInventoryData}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-[#1A201A] text-sm font-semibold px-3.5 py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Muat ulang data inventaris"
            >
              <RefreshCw className={`w-4 h-4 text-[#236B37] ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#236B37] hover:bg-[#1B552B] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Tambah Stok Masuk
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Total Stok Gudang</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#236B37]">
                    {summaryStats.totalTons}
                  </span>
                  <span className="text-sm font-semibold text-[#6D756D]">Ton</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6D756D]">
                  Kapasitas terpakai:{' '}
                  <strong className="text-[#236B37]">
                    {summaryStats.occupancyPct.toFixed(1)}%
                  </strong>
                </span>
                <span className="text-[#8E968E]">
                  ({summaryStats.totalKg.toLocaleString('id-ID')} kg)
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#236B37] rounded-full transition-all"
                  style={{ width: `${summaryStats.occupancyPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Estimasi Nilai Stok</div>
                <div className="mt-1 text-2xl font-extrabold text-[#8A5A19]">
                  {formatCompactRupiah(summaryStats.totalEstimatedValue)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-[#6D756D]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#236B37] shrink-0" />
                <span>Harga tebas rata-rata tertimbang</span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8A5A19] rounded-full transition-all"
                  style={{ width: items.length > 0 ? '80%' : '0%' }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Kapasitas Tersedia</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#1A201A]">
                    {summaryStats.availableTons}
                  </span>
                  <span className="text-sm font-semibold text-[#6D756D]">Ton</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F3EFE6] text-[#5C645C] flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#6D756D]">
                <span>
                  Tersebar di <strong className="text-[#1A201A]">{items.length}</strong> Lot
                </span>
                <span>•</span>
                <span>
                  Sisa <strong className="text-[#1A201A]">{summaryStats.availablePct.toFixed(0)}%</strong>
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6D756D] rounded-full transition-all"
                  style={{ width: `${summaryStats.availablePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Peringatan Stok</div>
                <div className="mt-1 text-2xl font-extrabold text-[#B6771E]">
                  {summaryStats.alertCount} Komoditas
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FDF3DC] text-[#B6771E] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8A5A19]">
                <span className="w-2 h-2 rounded-full bg-[#B6771E] shrink-0" />
                <span className="truncate">{summaryStats.alertNames}</span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E09B2D] rounded-full transition-all"
                  style={{ width: summaryStats.alertCount > 0 ? '55%' : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table Container */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8E968E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis komoditas, varietas, lokasi, atau batch..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F6F2EA] border border-[#E6DFD2] text-xs sm:text-sm text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'Semua', label: `Semua Komoditas (${items.length})` },
                  { key: 'Gabah', label: 'Gabah' },
                  { key: 'Beras', label: 'Beras' },
                  { key: 'Palawija', label: 'Palawija' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === tab.key
                      ? 'bg-[#236B37] text-white'
                      : 'bg-[#F4EFE6] text-[#5C645C] hover:bg-[#EAE2D3]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="hidden sm:block h-5 w-[1px] bg-[#E5DEC9] mx-1" />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F6F2EA] border border-[#E6DFD2] text-xs font-medium text-[#2D332D] focus:outline-none cursor-pointer"
              >
                <option value="Semua">Status Stok: Semua</option>
                <option value="Aman">Status: Aman</option>
                <option value="Menipis">Status: Menipis</option>
                <option value="Kritis">Status: Kritis</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Semua');
                  setStatusFilter('Semua');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F6F2EA] hover:bg-[#EAE2D3] border border-[#E6DFD2] text-xs font-medium text-[#2D332D] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2.5">
              <Loader2 className="w-7 h-7 text-[#236B37] animate-spin" />
              <p className="text-sm font-bold text-[#1A201A]">Memuat Data Inventaris Gudang...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5 bg-[#FAF8F3] rounded-2xl border border-[#EFEAE0]">
              <PackageOpen className="w-9 h-9 text-[#8A5A19] mx-auto" />
              <h3 className="text-sm sm:text-base font-bold text-[#1A201A]">
                Belum Ada Stok Gudang Tercatat
              </h3>
              <p className="text-xs text-[#6D756D] max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'Semua' || statusFilter !== 'Semua'
                  ? 'Tidak ditemukan lot komoditas yang sesuai dengan filter pencarian Anda.'
                  : 'Catat penerimaan hasil panen masuk ke silo atau gudang dengan menekan tombol "Tambah Stok Masuk".'}
              </p>
              {!searchQuery && selectedCategory === 'Semua' && statusFilter === 'Semua' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Stok Masuk
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[880px]">
                <thead>
                  <tr className="bg-[#F6F2EA] text-[11px] font-bold uppercase tracking-wider text-[#6D756D]">
                    <th className="py-3.5 px-4 rounded-l-xl">KOMODITAS &amp; VARIETAS</th>
                    <th className="py-3.5 px-4">LOKASI PENYIMPANAN</th>
                    <th className="py-3.5 px-4 text-right">TOTAL STOK (KG/TON)</th>
                    <th className="py-3.5 px-4 text-right">HARGA TEBAS AVG</th>
                    <th className="py-3.5 px-4 text-right">ACUAN JUAL PASAR</th>
                    <th className="py-3.5 px-4 text-center">STATUS STOK</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1] text-xs sm:text-sm">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FCFBF8] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          {renderCategoryIcon(item.category, item.status)}
                          <div>
                            <div className="font-bold text-[#1A201A] leading-snug">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#7A827A] mt-0.5">
                              {item.variety}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs font-medium text-[#4A524A]">
                        {item.location}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div
                          className={`font-bold ${
                            item.status === 'Kritis'
                              ? 'text-[#C93B3B]'
                              : item.status === 'Menipis'
                              ? 'text-[#9C651B]'
                              : 'text-[#1A201A]'
                          }`}
                        >
                          {item.totalStockTon}
                        </div>
                        <div className="text-[11px] text-[#8E968E]">
                          ({item.totalStockKg})
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-[#1A201A]">
                          {item.avgBuyPrice}
                        </span>{' '}
                        <span className="text-xs text-[#8E968E]">/ kg</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-[#236B37]">
                          {item.marketRefPrice}
                        </span>{' '}
                        <span className="text-xs text-[#8E968E]">/ kg</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {item.status === 'Aman' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                            Aman
                          </span>
                        )}
                        {item.status === 'Menipis' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDF3DC] text-[#9C651B] text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#B6771E]" />
                            Menipis
                          </span>
                        )}
                        {item.status === 'Kritis' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FCECEC] text-[#C93B3B] text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" />
                            Kritis
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {item.status === 'Aman' && (
                            <button
                              type="button"
                              onClick={() => (window.location.href = '/middleman/jual-stok')}
                              className="px-3 py-1.5 rounded-lg bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Jual Stok
                            </button>
                          )}
                          {item.status === 'Menipis' && (
                            <button
                              type="button"
                              onClick={() => (window.location.href = '/middleman/cari-pasokan')}
                              className="px-3 py-1.5 rounded-lg bg-[#8A5A19] hover:bg-[#734A13] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cari Pasokan
                            </button>
                          )}
                          {item.status === 'Kritis' && (
                            <button
                              type="button"
                              onClick={() => (window.location.href = '/middleman/cari-pasokan')}
                              className="px-3 py-1.5 rounded-lg bg-[#C93B3B] hover:bg-[#AD2E2E] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cari Pasokan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="px-3 py-1.5 rounded-lg bg-[#F4EFE6] hover:bg-[#E7DFD0] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F0EBE1] text-xs text-[#6D756D]">
            <span>
              Menampilkan {filteredItems.length} dari {items.length} entitas komoditas
            </span>
          </div>
        </div>

        {/* Bottom 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Riwayat Keluar-Masuk Terakhir */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#236B37]" />
                <h2 className="text-base font-bold text-[#1A201A]">
                  Riwayat Keluar-Masuk Terakhir
                </h2>
              </div>
            </div>

            {mutations.length === 0 ? (
              <div className="bg-[#FAF8F3] rounded-xl p-6 border border-[#EDE6D8] text-center text-xs text-[#6D756D]">
                Belum ada riwayat mutasi keluar-masuk gudang yang tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {mutations.map((mut) => (
                  <div
                    key={mut.id}
                    className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 mt-0.5 ${
                          mut.type === 'in'
                            ? 'bg-[#236B37] text-white'
                            : 'bg-[#8A5A19] text-white'
                        }`}
                      >
                        {mut.type === 'in' ? '+ MASUK' : '- KELUAR'}
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-[#1A201A]">
                          {mut.title} •{' '}
                          <span className="font-normal text-[#555D55]">{mut.partner}</span>
                        </div>
                        <div className="text-[11px] text-[#7A827A] mt-0.5">{mut.docRef}</div>
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-[11px] text-[#7A827A]">{mut.timeLabel}</div>
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-[#236B37] mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {mut.statusLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kepatuhan Standar Gudang */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1A201A]">
                  Standar Mutu &amp; Tera Silo
                </h2>
                <p className="text-[11px] text-[#6D756D]">
                  Pencatatan Timbangan Digital Tandur
                </p>
              </div>
            </div>

            <p className="text-xs text-[#555D55] leading-relaxed">
              Seluruh bobot komoditas yang masuk ke silo dan gudang tercatat menggunakan standar penimbangan digital terkalibrasi guna menjaga transparansi rendemen dan kadar air.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Detail & Hapus Stok */}
      <InventoryDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onDelete={handleDeleteStock}
      />

      {/* Modal Tambah Stok Masuk */}
      <AddIncomingStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveIncomingStock}
      />
    </div>
  );
};

export default InventoryListPage;