import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  FileSpreadsheet,
  Truck,
  Hourglass,
  Search,
  Calendar,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  MapPin,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { EditTransactionModal, TransactionPOItem } from './EditTransactionModal';
import { MiddlemanApi } from '@/services/api';

const LOCAL_ORDERS_KEY = 'tandur_local_po_orders';

const getInitials = (name: string): string => {
  const parts = (name || 'PT').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'PT';
};

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

const formatDateLabel = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const MiddlemanTransactionPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionPOItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Semua Pesanan');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCommodityFilter, setSelectedCommodityFilter] = useState<string>('ALL');
  const [editingItem, setEditingItem] = useState<TransactionPOItem | null>(null);

  const mapLocalOrderToPOItem = (raw: any): TransactionPOItem => {
    const weightKg = Number(raw.weight_kg ?? raw.quantity ?? raw.offered_quantity ?? 0);
    const pricePerKg = Number(raw.price_per_kg ?? raw.price_per_unit ?? raw.offered_price ?? 0);
    const totalVal = Number(raw.total_price ?? weightKg * pricePerKg);

    const rawStatus = String(raw.status || 'pending');
    let mappedStatus: TransactionPOItem['status'] = 'Menuju Gudang Pembeli';
    if (rawStatus === 'completed') {
      mappedStatus = 'Selesai & Diterima';
    } else if (rawStatus === 'in_transit') {
      mappedStatus = 'Diterima di Gudang';
    }

    const isCompleted = mappedStatus !== 'Menuju Gudang Pembeli';
    const pickupText = raw.pickup_date ? formatDateLabel(raw.pickup_date) : 'Sesuai Kesepakatan';

    return {
      id: String(raw.id),
      poNumber: String(raw.po_number || raw.id),
      isNew: rawStatus === 'pending',
      contractDate: formatDateLabel(raw.created_at),
      scheduleInfo: isCompleted ? `Selesai Bongkar: ${pickupText}` : `Jadwal: ${pickupText}`,
      scheduleType: isCompleted ? 'completed' : 'upcoming',
      farmerInitials: getInitials(raw.farmer_name || 'Petani Mitra'),
      farmerName: raw.farmer_name || 'Petani Mitra',
      farmerGroup: raw.farmer_group || 'Mitra Petani Tandur',
      locationNote: raw.pickup_address || 'Lokasi Gudang Tani',
      locationIcon: isCompleted ? 'check' : 'pin',
      commodityName: raw.commodity_name || 'Hasil Panen',
      weightText: `${(weightKg / 1000).toFixed(1)} Ton (${weightKg.toLocaleString('id-ID')} kg)`,
      weightKg,
      pricePerKg,
      totalValueText: formatRupiah(totalVal),
      pricePerKgText: `${formatRupiah(pricePerKg)} / kg`,
      status: mappedStatus,
      fleetText: raw.fleet_text || 'Armada Logistik Tandur',
      fieldNotes: raw.notes || '',
    };
  };

  const loadTransactions = () => {
    try {
      const rawLocal = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      if (Array.isArray(rawLocal)) {
        setTransactions(rawLocal.map(mapLocalOrderToPOItem));
      } else {
        setTransactions([]);
      }
    } catch {
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const totalContractValue = useMemo(() => {
    return transactions.reduce((sum, item) => sum + item.weightKg * item.pricePerKg, 0);
  }, [transactions]);

  const inTransitTons = useMemo(() => {
    const kg = transactions
      .filter((t) => t.status === 'Menuju Gudang Pembeli')
      .reduce((sum, item) => sum + item.weightKg, 0);
    return (kg / 1000).toFixed(1).replace('.', ',');
  }, [transactions]);

  const upcomingCount = useMemo(() => {
    return transactions.filter((t) => t.status === 'Menuju Gudang Pembeli').length;
  }, [transactions]);

  const commodityCategories = useMemo(() => {
    const names = Array.from(
      new Set(transactions.map((t) => t.commodityName).filter(Boolean))
    );
    return ['ALL', ...names];
  }, [transactions]);

  const handleCycleFilter = () => {
    if (commodityCategories.length <= 1) return;
    const idx = commodityCategories.indexOf(selectedCommodityFilter);
    setSelectedCommodityFilter(commodityCategories[(idx + 1) % commodityCategories.length]);
  };

  const tabs = [
    {
      label: 'Semua Pesanan',
      count: transactions.length,
      badgeColor: 'bg-[#236B37] text-white',
    },
    {
      label: 'Menunggu Konfirmasi',
      count: transactions.filter((t) => t.isNew).length,
      badgeColor: 'bg-[#E5DEC9] text-[#4A524A]',
    },
    {
      label: 'Sedang Dikirim',
      count: transactions.filter((t) => t.status === 'Menuju Gudang Pembeli').length,
      badgeColor: 'bg-[#F5E6CD] text-[#8A5A19]',
    },
    {
      label: 'Selesai',
      count: transactions.filter((t) => t.status !== 'Menuju Gudang Pembeli').length,
      badgeColor: 'bg-[#E5DEC9] text-[#4A524A]',
    },
  ];

  const filteredList = useMemo(() => {
    return transactions.filter((item) => {
      if (activeTab === 'Menunggu Konfirmasi' && !item.isNew) return false;
      if (activeTab === 'Sedang Dikirim' && item.status !== 'Menuju Gudang Pembeli') return false;
      if (activeTab === 'Selesai' && item.status === 'Menuju Gudang Pembeli') return false;

      if (
        selectedCommodityFilter !== 'ALL' &&
        item.commodityName !== selectedCommodityFilter
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.poNumber.toLowerCase().includes(q) ||
        item.farmerName.toLowerCase().includes(q) ||
        item.farmerGroup.toLowerCase().includes(q) ||
        item.commodityName.toLowerCase().includes(q)
      );
    });
  }, [transactions, activeTab, selectedCommodityFilter, searchQuery]);

  const handleSaveEdit = async (updated: TransactionPOItem) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? {
              ...updated,
              weightText: `${(updated.weightKg / 1000).toFixed(1)} Ton (${updated.weightKg.toLocaleString('id-ID')} kg)`,
            }
          : t
      )
    );

    await Swal.fire({
      icon: 'success',
      title: 'Perubahan PO Disimpan',
      text: `Dokumen ${updated.poNumber} berhasil diperbarui.`,
      timer: 1600,
      showConfirmButton: false,
    });
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Surat Pesanan?',
      text: 'Data PO ini akan dihapus dari daftar transaksi Anda.',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#C93B3B',
    });

    if (!confirm.isConfirmed) return;

    try {
      await MiddlemanApi.deletePurchaseOrder(id);
    } catch {
      // Abaikan error API jika disimpan lokal
    }

    try {
      const rawLocal = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      if (Array.isArray(rawLocal)) {
        const filteredLocal = rawLocal.filter((item: any) => String(item.id) !== String(id));
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(filteredLocal));
      }
    } catch {
      // Abaikan parse error
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await Swal.fire({
      icon: 'success',
      title: 'PO Dihapus',
      timer: 1400,
      showConfirmButton: false,
    });
  };

  const handleExportCSV = async () => {
    if (filteredList.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Belum Ada Data',
        text: 'Tidak ada data transaksi PO yang dapat diekspor.',
        confirmButtonColor: '#236B37',
      });
      return;
    }

    const headers = [
      'No PO',
      'Tanggal Kontrak',
      'Nama Petani',
      'Komoditas',
      'Bobot (kg)',
      'Harga per kg',
      'Total Nilai',
      'Status',
      'Armada',
    ];
    const rows = filteredList.map((t) => [
      t.poNumber,
      t.contractDate,
      `"${t.farmerName}"`,
      `"${t.commodityName}"`,
      t.weightKg,
      t.pricePerKg,
      t.weightKg * t.pricePerKg,
      `"${t.status}"`,
      `"${t.fleetText}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_PO_Tandur_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await Swal.fire({
      icon: 'success',
      title: 'Laporan PO Diekspor',
      text: 'Rekap kontrak pengadaan berhasil diunduh dalam format CSV.',
      timer: 1600,
      showConfirmButton: false,
    });
  };

  const currentPeriodLabel = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
              <span className="text-[#8A5A19]">MANAJEMEN PENGADAAN</span>
              <span className="text-[#B8B0A0]">•</span>
              <span className="text-[#236B37]">B2B Mitra Tengkulak</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A201A]">
              Transaksi &amp; Surat Pesanan (PO)
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Pantau kontrak pengadaan komoditas, status timbang sawah, surat jalan, dan penerimaan di gudang secara transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={loadTransactions}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-[#1A201A] text-sm font-semibold px-3.5 py-3 rounded-xl transition-colors cursor-pointer"
              title="Muat ulang data transaksi"
            >
              <RefreshCw className="w-4 h-4 text-[#236B37]" />
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = '/middleman/cari-pasokan')}
              className="inline-flex items-center justify-center gap-2 bg-[#236B37] hover:bg-[#1B552B] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Buat PO Baru
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div>
              <div className="text-xs text-[#6D756D] leading-snug">
                Total Nilai
                <br />
                Kontrak PO
              </div>
              <div className="text-xl font-bold text-[#1A201A] mt-1">
                {formatCompactRupiah(totalContractValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div>
              <div className="text-xs text-[#6D756D] leading-snug">
                Tonase Dalam
                <br />
                Pengiriman
              </div>
              <div className="text-xl font-bold text-[#1A201A] mt-1">
                {inTransitTons} Ton
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div>
              <div className="text-xs text-[#6D756D] leading-snug">
                Jadwal Timbang
                <br />
                Aktif
              </div>
              <div className="text-xl font-bold text-[#1A201A] mt-1">
                {upcomingCount} Lokasi
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F3EFE6] text-[#7D5318] flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#236B37] text-white'
                      : 'bg-[#F4EFE6] text-[#555D55] hover:bg-[#EAE2D3]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : tab.badgeColor
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E968E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. PO, nama petani, gapoktan, atau komoditas..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#DFD8CA] text-xs sm:text-sm text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#DFD8CA] text-xs font-medium text-[#2D332D]">
                <Calendar className="w-4 h-4 text-[#7A827A]" />
                <span>Periode: {currentPeriodLabel}</span>
              </div>

              <button
                type="button"
                onClick={handleCycleFilter}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-semibold text-[#2D332D] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {selectedCommodityFilter === 'ALL'
                  ? 'Semua Komoditas'
                  : selectedCommodityFilter}
              </button>
            </div>
          </div>

          {/* Table or Empty State */}
          {filteredList.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5 bg-[#FAF8F3] rounded-2xl border border-[#EFEAE0]">
              <div className="w-11 h-11 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A201A]">
                Belum Ada Transaksi Surat Pesanan (PO)
              </h3>
              <p className="text-xs text-[#6D756D] max-w-md mx-auto">
                {searchQuery || selectedCommodityFilter !== 'ALL'
                  ? 'Tidak ada dokumen PO yang sesuai dengan pencarian atau filter Anda.'
                  : 'Ajukan pesanan borongan langsung kepada petani melalui halaman Cari Petani & Pasokan.'}
              </p>
              {!searchQuery && selectedCommodityFilter === 'ALL' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => (window.location.href = '/middleman/cari-pasokan')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Cari Pasokan &amp; Buat PO
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F6F2EA] text-xs font-semibold text-[#5C645C]">
                    <th className="py-3.5 px-4 rounded-l-xl">No. PO &amp; Jadwal</th>
                    <th className="py-3.5 px-4">Petani / Gapoktan</th>
                    <th className="py-3.5 px-4">Komoditas &amp; Nilai</th>
                    <th className="py-3.5 px-4">Armada &amp; Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1] text-xs sm:text-sm">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FCFBF8] transition-colors">
                      <td className="py-4 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              item.isNew ? 'text-[#236B37]' : 'text-[#1A201A]'
                            }`}
                          >
                            {item.poNumber}
                          </span>
                          {item.isNew && (
                            <span className="px-2 py-0.5 rounded-md bg-[#E1F3E5] text-[#236B37] text-[10px] font-bold">
                              Baru
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#6D756D]">
                          <Calendar className="w-3.5 h-3.5 text-[#8E968E]" />
                          <span>Kontrak: {item.contractDate}</span>
                        </div>
                        <div
                          className={`flex items-start gap-1.5 text-xs font-semibold ${
                            item.scheduleType === 'upcoming'
                              ? 'text-[#8A5A19]'
                              : 'text-[#6D756D] font-normal'
                          }`}
                        >
                          {item.scheduleType === 'upcoming' ? (
                            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#8E968E] shrink-0 mt-0.5" />
                          )}
                          <span>{item.scheduleInfo}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] border border-[#E5DEC9] text-[#5C645C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {item.farmerInitials}
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-[#1A201A]">
                              {item.farmerName}
                            </div>
                            <div className="text-xs text-[#6D756D]">
                              {item.farmerGroup}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#7A827A]">
                              {item.locationIcon === 'pin' ? (
                                <MapPin className="w-3 h-3 text-[#8A5A19] shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-[#236B37] shrink-0" />
                              )}
                              <span>{item.locationNote}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top space-y-1">
                        <div className="font-bold text-[#1A201A] leading-snug">
                          {item.commodityName}
                        </div>
                        <div className="text-xs text-[#555D55]">{item.weightText}</div>
                        <div className="font-bold text-[#236B37] pt-0.5">
                          {item.totalValueText}
                        </div>
                        <div className="text-[11px] text-[#8E968E]">
                          {item.pricePerKgText}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top space-y-2">
                        {item.status === 'Menuju Gudang Pembeli' ? (
                          <div className="inline-flex items-start gap-2 px-3 py-1.5 rounded-xl bg-[#F6E6CC] text-[#7D4F12] text-xs font-bold leading-tight">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9C651B] mt-1 shrink-0" />
                            <span>Menuju Gudang Pembeli</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFECE6] text-[#4A524A] text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#236B37]" />
                            <span>{item.status}</span>
                          </div>
                        )}

                        <div className="flex items-start gap-1.5 text-[11px] text-[#6D756D]">
                          <Truck className="w-3.5 h-3.5 text-[#8E968E] shrink-0 mt-0.5" />
                          <span>{item.fleetText}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-middle text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#EFECE6] border border-[#E2DACB] text-xs font-semibold text-[#1A201A] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-[#236B37]" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#FCECEC] border border-[#F2D5D5] text-xs font-semibold text-[#C93B3B] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Ekspor & Ringkasan */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E2DACB] text-xs font-semibold text-[#2D332D] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8A5A19]" />
              Ekspor Laporan (CSV)
            </button>
            <span className="text-xs text-[#6D756D]">
              Menampilkan {filteredList.length} dari {transactions.length} pesanan
            </span>
          </div>
        </div>
      </div>

      {/* Pop-up Edit Transaksi & PO */}
      <EditTransactionModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        transaction={editingItem}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default MiddlemanTransactionPage;