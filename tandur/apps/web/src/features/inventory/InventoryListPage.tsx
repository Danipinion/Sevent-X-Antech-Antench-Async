import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InventoryDetailModal, InventoryItemDetail } from './InventoryDetailModal';

const INVENTORY_ITEMS: InventoryItemDetail[] = [
  {
    id: '1',
    batchId: '#BATCH-TNDR-0518',
    name: 'Gabah Kering Panen (GKP)',
    variety: 'Varietas Ciherang Super',
    category: 'Gabah',
    status: 'Aman',
    statusBadgeText: 'Aman / Optimal',
    processingStatus: 'Siap Giling Rice Mill',
    totalStockTon: '18.5 Ton',
    totalStockKg: '18.500 kg',
    progressPercent: 92.5,
    location: 'Silo 1 - Karangawen',
    occupancyText: 'Okupansi 92.5% • Kapasitas Maks 20 Ton',
    avgBuyPrice: 'Rp 6.800',
    buyPriceNote: 'Harga tertimbang 3 transaksi masuk',
    marketRefPrice: 'Rp 7.200',
    marginBadge: '+Rp 400/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Kadar Air 14% (Standar Silo)',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: 'Kemarin, 14:00 WIB',
    lastIncomingSource: 'Gapoktan Sumber Makmur (+5.0 Ton)',
  },
  {
    id: '2',
    batchId: '#BATCH-TNDR-0514',
    name: 'Gabah Kering Giling (GKG)',
    variety: 'Inpari 32 Siap Giling',
    category: 'Gabah',
    status: 'Aman',
    statusBadgeText: 'Aman / Optimal',
    processingStatus: 'Siap Giling Rice Mill',
    totalStockTon: '12.0 Ton',
    totalStockKg: '12.000 kg',
    progressPercent: 75,
    location: 'Silo 2 - Karangawen',
    occupancyText: 'Okupansi 75.0% • Kapasitas Maks 16 Ton',
    avgBuyPrice: 'Rp 7.900',
    buyPriceNote: 'Harga tertimbang 2 transaksi masuk',
    marketRefPrice: 'Rp 8.400',
    marginBadge: '+Rp 500/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Kadar Air 12.5% (Standar Giling)',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: '3 Hari Lalu',
    lastIncomingSource: 'Gapoktan Subur Rejo (+8.0 Ton)',
  },
  {
    id: '3',
    batchId: '#BATCH-TNDR-0509',
    name: 'Beras Putih Medium IR-64',
    variety: 'Kemasan Karung 50kg',
    category: 'Beras',
    status: 'Aman',
    statusBadgeText: 'Aman / Optimal',
    processingStatus: 'Siap Distribusi Pasar',
    totalStockTon: '3.2 Ton',
    totalStockKg: '3.200 kg',
    progressPercent: 64,
    location: 'Gudang B - Blok 1',
    occupancyText: 'Okupansi 64.0% • Kapasitas Maks 5 Ton',
    avgBuyPrice: 'Rp 11.200',
    buyPriceNote: 'Harga pokok giling & kemasan',
    marketRefPrice: 'Rp 12.500',
    marginBadge: '+Rp 1.300/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Derajat Sosoh 95% (Medium)',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: '4 Hari Lalu',
    lastIncomingSource: 'Hasil Giling Silo 1 (+3.2 Ton)',
  },
  {
    id: '4',
    batchId: '#BATCH-TNDR-0512',
    name: 'Beras Mentik Organik',
    variety: 'Kemasan Sak 50kg Segel',
    category: 'Beras',
    status: 'Menipis',
    statusBadgeText: 'Stok Menipis',
    processingStatus: 'Siap Distribusi Pasar',
    totalStockTon: '1.8 Ton',
    totalStockKg: '1.800 kg',
    progressPercent: 36,
    location: 'Gudang B - Blok 2',
    occupancyText: 'Okupansi 36.0% • Kapasitas Maks 5 Ton',
    avgBuyPrice: 'Rp 13.500',
    buyPriceNote: 'Harga tertimbang petani mitra',
    marketRefPrice: 'Rp 15.000',
    marginBadge: '+Rp 1.500/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Sertifikat Organik Aktif',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: '3 Hari Lalu',
    lastIncomingSource: 'Petani Mandiri Ibu Suparni (+3.5 Ton)',
  },
  {
    id: '5',
    batchId: '#BATCH-TNDR-0498',
    name: 'Jagung Pipil Kering',
    variety: 'KA 15% (Pakan Ternak)',
    category: 'Palawija',
    status: 'Menipis',
    statusBadgeText: 'Stok Menipis',
    processingStatus: 'Siap Kirim Pabrik Pakan',
    totalStockTon: '2.5 Ton',
    totalStockKg: '2.500 kg',
    progressPercent: 25,
    location: 'Silo 3 - Guntur',
    occupancyText: 'Okupansi 25.0% • Kapasitas Maks 10 Ton',
    avgBuyPrice: 'Rp 5.150',
    buyPriceNote: 'Harga tertimbang 2 transaksi masuk',
    marketRefPrice: 'Rp 5.800',
    marginBadge: '+Rp 650/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Kadar Air 15% (Standar Pakan)',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: '5 Hari Lalu',
    lastIncomingSource: 'Poktan Jagung Jaya (+6.0 Ton)',
  },
  {
    id: '6',
    batchId: '#BATCH-TNDR-0480',
    name: 'Kedelai Anjasmoro Lokal',
    variety: 'Mutu Biji Kering Standar',
    category: 'Beras',
    status: 'Kritis',
    statusBadgeText: 'Stok Kritis',
    processingStatus: 'Perlu Restock Segera',
    totalStockTon: '200 kg',
    totalStockKg: '0.2 Ton',
    progressPercent: 10,
    location: 'Gudang B - Palet C',
    occupancyText: 'Okupansi 10.0% • Kapasitas Maks 2 Ton',
    avgBuyPrice: 'Rp 10.500',
    buyPriceNote: 'Harga tertimbang batch terakhir',
    marketRefPrice: 'Rp 12.000',
    marginBadge: '+Rp 1.500/kg margin',
    marketUpdateNote: 'Update Bapanas hari ini',
    moistureQuality: 'Kadar Air 13% (Kering Simpan)',
    calibrationNote: 'Tera Metrologi Legal Aktif 2025',
    lastIncomingTime: '1 Minggu Lalu',
    lastIncomingSource: 'Poktan Grobogan Makmur (+1.0 Ton)',
  },
];

export const InventoryListPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Gabah' | 'Beras' | 'Palawija'>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItemDetail | null>(null);

  const filteredItems = INVENTORY_ITEMS.filter((item) => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchStatus && matchSearch;
  });

  const renderCategoryIcon = (index: number) => {
    if (index === 0 || index === 1) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
          <LayoutGrid className="w-4 h-4" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F5EFE6] text-[#8A5A19] flex items-center justify-center shrink-0">
          <Home className="w-4 h-4" />
        </div>
      );
    }
    if (index === 3) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#9C651B] flex items-center justify-center shrink-0">
          <Package className="w-4 h-4" />
        </div>
      );
    }
    if (index === 4) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#9C651B] flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#FCECEC] text-[#C93B3B] flex items-center justify-center shrink-0">
        <FileSpreadsheet className="w-4 h-4" />
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
              GUDANG UTAMA & SILO PENAMPUNGAN
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1A201A] tracking-tight">
              Inventaris Stok Gudang
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Monitoring real-time kapasitas silo, tonase komoditas gabah dan beras, status pergerakan keluar-masuk gudang Karangawen & Guntur.
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 bg-[#236B37] hover:bg-[#1B552B] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm self-start lg:self-auto cursor-pointer">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            + Tambah Stok Masuk
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Total Stok Gudang */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Total Stok Gudang</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#236B37]">38.2</span>
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
                  Kapasitas terpakai: <strong className="text-[#236B37]">76.4%</strong>
                </span>
                <span className="text-[#8E968E]">(38.200 kg)</span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div className="h-full bg-[#236B37] rounded-full w-[76.4%]" />
              </div>
            </div>
          </div>

          {/* Card 2: Estimasi Nilai Stok */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Estimasi Nilai Stok</div>
                <div className="mt-1 text-2xl font-extrabold text-[#8A5A19]">
                  Rp 312.45 Jt
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
                <div className="h-full bg-[#8A5A19] rounded-full w-[82%]" />
              </div>
            </div>
          </div>

          {/* Card 3: Kapasitas Tersedia */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Kapasitas Tersedia</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#1A201A]">11.8</span>
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
                  Gudang A: <strong className="text-[#1A201A]">4.5 T</strong>
                </span>
                <span>•</span>
                <span>
                  Silo B: <strong className="text-[#1A201A]">7.3 T</strong>
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div className="h-full bg-[#6D756D] rounded-full w-[32%]" />
              </div>
            </div>
          </div>

          {/* Card 4: Peringatan Stok */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#6D756D]">Peringatan Stok</div>
                <div className="mt-1 text-2xl font-extrabold text-[#B6771E]">
                  2 Komoditas
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FDF3DC] text-[#B6771E] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8A5A19]">
                <span className="w-2 h-2 rounded-full bg-[#B6771E]" />
                <span className="truncate">Beras Mentik & Jagung Pipil</span>
              </div>
              <div className="w-full h-1.5 bg-[#ECE6DA] rounded-full overflow-hidden">
                <div className="h-full bg-[#E09B2D] rounded-full w-[55%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table Container */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8E968E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis komoditas, varietas, atau nomor batch..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F6F2EA] border border-[#E6DFD2] text-xs sm:text-sm text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            {/* Category Pills & Right Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'Semua', label: 'Semua Komoditas (6)' },
                  { key: 'Gabah', label: 'Gabah (2)' },
                  { key: 'Beras', label: 'Beras (3)' },
                  { key: 'Palawija', label: 'Palawija (1)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
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

              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F6F2EA] hover:bg-[#EAE2D3] border border-[#E6DFD2] text-xs font-medium text-[#2D332D] transition-colors cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter Lanjutan
              </button>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-[#F6F2EA] text-[11px] font-bold uppercase tracking-wider text-[#6D756D]">
                  <th className="py-3.5 px-4 rounded-l-xl">KOMODITAS & VARIETAS</th>
                  <th className="py-3.5 px-4">LOKASI PENYIMPANAN</th>
                  <th className="py-3.5 px-4 text-right">TOTAL STOK (KG/TON)</th>
                  <th className="py-3.5 px-4 text-right">HARGA TEBAS AVG</th>
                  <th className="py-3.5 px-4 text-right">ACUAN JUAL PASAR</th>
                  <th className="py-3.5 px-4 text-center">STATUS STOK</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1] text-xs sm:text-sm">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FCFBF8] transition-colors"
                  >
                    {/* Komoditas */}
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        {renderCategoryIcon(idx)}
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

                    {/* Lokasi */}
                    <td className="py-4 px-4 text-xs font-medium text-[#4A524A]">
                      {item.location}
                    </td>

                    {/* Total Stok */}
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

                    {/* Harga Tebas */}
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-[#1A201A]">
                        {item.avgBuyPrice}
                      </span>{' '}
                      <span className="text-xs text-[#8E968E]">/ kg</span>
                    </td>

                    {/* Acuan Jual */}
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-[#236B37]">
                        {item.marketRefPrice}
                      </span>{' '}
                      <span className="text-xs text-[#8E968E]">/ kg</span>
                    </td>

                    {/* Status */}
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

                    {/* Aksi */}
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status === 'Aman' && (
                          <button className="px-3 py-1.5 rounded-lg bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer">
                            Jual Stok
                          </button>
                        )}
                        {item.status === 'Menipis' && (
                          <button className="px-3 py-1.5 rounded-lg bg-[#8A5A19] hover:bg-[#734A13] text-white text-xs font-semibold transition-colors cursor-pointer">
                            Cari Pasokan
                          </button>
                        )}
                        {item.status === 'Kritis' && (
                          <button className="px-3 py-1.5 rounded-lg bg-[#C93B3B] hover:bg-[#AD2E2E] text-white text-xs font-semibold transition-colors cursor-pointer">
                            Cari Pasokan
                          </button>
                        )}
                        <button
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

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F0EBE1] text-xs text-[#6D756D]">
            <span>Menampilkan {filteredItems.length} dari 6 entitas komoditas</span>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded-lg bg-[#F6F2EA] text-[#8E968E] flex items-center justify-center cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-[#236B37] text-white font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-7 h-7 rounded-lg bg-[#F6F2EA] text-[#8E968E] flex items-center justify-center cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Riwayat Keluar-Masuk Terakhir (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#236B37]" />
                <h2 className="text-base font-bold text-[#1A201A]">
                  Riwayat Keluar-Masuk Terakhir
                </h2>
              </div>
              <button className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer">
                Lihat Semua Mutasi
              </button>
            </div>

            <div className="space-y-3">
              {/* Mutasi 1 */}
              <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#236B37] text-white text-[11px] font-bold shrink-0 mt-0.5">
                    + MASUK
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1A201A]">
                      +5.0 Ton GKP Ciherang •{' '}
                      <span className="font-normal text-[#555D55]">Gapoktan Sumber Makmur</span>
                    </div>
                    <div className="text-[11px] text-[#7A827A] mt-0.5">
                      No. Dokumen: PO-TNDR-0518 • Silo 1
                    </div>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-[11px] text-[#7A827A]">Kemarin, 14:00 WIB</div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#236B37] mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Timbang Selesai
                  </div>
                </div>
              </div>

              {/* Mutasi 2 */}
              <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#8A5A19] text-white text-[11px] font-bold shrink-0 mt-0.5">
                    - KELUAR
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1A201A]">
                      -8.0 Ton GKG Inpari 32 •{' '}
                      <span className="font-normal text-[#555D55]">Kirim ke Rice Mill CV Subur Pangan</span>
                    </div>
                    <div className="text-[11px] text-[#7A827A] mt-0.5">
                      No. Surat Jalan: DO-TNDR-019 • Truk CDD H 8421 BE
                    </div>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-[11px] text-[#7A827A]">2 Hari Lalu</div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#8A5A19] mt-0.5">
                    <Truck className="w-3.5 h-3.5" />
                    COD Tunai
                  </div>
                </div>
              </div>

              {/* Mutasi 3 */}
              <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-[#236B37] text-white text-[11px] font-bold shrink-0 mt-0.5">
                    + MASUK
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1A201A]">
                      +3.5 Ton Beras Mentik Wangi •{' '}
                      <span className="font-normal text-[#555D55]">Petani Mandiri Ibu Suparni</span>
                    </div>
                    <div className="text-[11px] text-[#7A827A] mt-0.5">
                      No. PO: PO-TNDR-0512 • Masuk Gudang B Sak
                    </div>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-[11px] text-[#7A827A]">3 Hari Lalu</div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#236B37] mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Diterima di Gudang
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Integritas Timbangan & Mutu (4 cols) */}
          <div className="lg:col-span-4 bg-[#EAF4EC] rounded-2xl border border-[#D4E8D8] p-5 sm:p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-[#1E6632] font-bold text-sm sm:text-base">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h3>Integritas Timbangan & Mutu</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#3A5A42] leading-relaxed">
              Semua arus masuk & keluar komoditas wajib melalui jembatan timbang terkalibrasi Tera Resmi UPTD Metrologi Legal Kab. Demak.
            </p>
          </div>
        </div>
      </div>

      {/* Pop-up Detail Komoditas */}
     <InventoryDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onDelete={(id) => {
          console.log('Hapus stok ID:', id);
          setSelectedItem(null);
        }}
        onEdit={(item) => {
          console.log('Edit stok:', item);
        }}
      />
    </div>
  );
};

export default InventoryListPage;