import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EditTransactionModal, TransactionPOItem } from './EditTransactionModal';

const INITIAL_TRANSACTIONS: TransactionPOItem[] = [
  {
    id: 'po-1',
    poNumber: 'PO-TNDR-2025-0518',
    isNew: true,
    contractDate: '16 Mei 2025',
    scheduleInfo: 'Jadwal: 18 Mei, 08:30 WIB',
    scheduleType: 'upcoming',
    farmerInitials: 'SM',
    farmerName: 'Pak Sugeng Santoso',
    farmerGroup: 'Gapoktan Sumber Makmur',
    locationNote: 'Sawah Karangawen Blok B, Demak',
    locationIcon: 'pin',
    commodityName: 'GKP Ciherang',
    weightText: '5.0 Ton (5.000 kg)',
    weightKg: 5000,
    pricePerKg: 6800,
    totalValueText: 'Rp 34.000.000',
    pricePerKgText: 'Rp 6.800 / kg',
    status: 'Menuju Gudang Pembeli',
    fleetText: 'Jemput Sendiri - Truk Engkel (H 8421 BE)',
  },
  {
    id: 'po-2',
    poNumber: 'PO-TNDR-2025-0512',
    contractDate: '12 Mei 2025',
    scheduleInfo: 'Perkiraan Sampai: Hari Ini, 14:00',
    scheduleType: 'upcoming',
    farmerInitials: 'SP',
    farmerName: 'Ibu Suparni',
    farmerGroup: 'Petani Mandiri • Godong',
    locationNote: 'Desa Angkatan Kidul, Godong',
    locationIcon: 'pin',
    commodityName: 'Beras Mentik Wangi',
    weightText: '2.5 Ton (50 Karung)',
    weightKg: 2500,
    pricePerKg: 13500,
    totalValueText: 'Rp 33.750.000',
    pricePerKgText: 'Rp 13.500 / kg',
    status: 'Menuju Gudang Pembeli',
    fleetText: 'Armada Logistik Tandur',
  },
  {
    id: 'po-3',
    poNumber: 'PO-TNDR-2025-0504',
    contractDate: '04 Mei 2025',
    scheduleInfo: 'Selesai Bongkar: 05 Mei 2025',
    scheduleType: 'completed',
    farmerInitials: 'MY',
    farmerName: 'Pak Mulyadi',
    farmerGroup: 'Gapoktan Subur Rejo',
    locationNote: 'Timbang Tera Gudang Induk',
    locationIcon: 'check',
    commodityName: 'Gabah Kering Giling (GKG)',
    weightText: '8.0 Ton (8.000 kg)',
    weightKg: 8000,
    pricePerKg: 7900,
    totalValueText: 'Rp 63.200.000',
    pricePerKgText: 'Rp 7.900 / kg',
    status: 'Diterima di Gudang',
    fleetText: 'Jemput Sendiri (CDD)',
  },
  {
    id: 'po-4',
    poNumber: 'PO-TNDR-2025-0428',
    contractDate: '28 Apr 2025',
    scheduleInfo: 'Selesai Bongkar: 29 Apr 2025',
    scheduleType: 'completed',
    farmerInitials: 'HY',
    farmerName: 'Pak Haryono',
    farmerGroup: 'Kelompok Tani Jagung Jaya',
    locationNote: 'Kadar Air 14% Teruji Lab Lokal',
    locationIcon: 'check',
    commodityName: 'Jagung Pipil Kering',
    weightText: '6.0 Ton (6.000 kg)',
    weightKg: 6000,
    pricePerKg: 5150,
    totalValueText: 'Rp 30.900.000',
    pricePerKgText: 'Rp 5.150 / kg',
    status: 'Selesai & Diterima',
    fleetText: 'Jemput Sendiri (Pickup)',
  },
];

export const MiddlemanTransactionPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionPOItem[]>(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<string>('Semua Pesanan');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItem, setEditingItem] = useState<TransactionPOItem | null>(null);

  const tabs = [
    { label: 'Semua Pesanan', count: 12, badgeColor: 'bg-[#236B37] text-white' },
    { label: 'Menunggu Konfirmasi', count: 1, badgeColor: 'bg-[#E5DEC9] text-[#4A524A]' },
    { label: 'Surat Jalan & Muat', count: 2, badgeColor: 'bg-[#F5E6CD] text-[#8A5A19]' },
    { label: 'Sedang Dikirim', count: 1, badgeColor: 'bg-[#F5E6CD] text-[#8A5A19]' },
    { label: 'Selesai', count: 8, badgeColor: 'bg-[#E5DEC9] text-[#4A524A]' },
  ];

  const filteredList = transactions.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.poNumber.toLowerCase().includes(q) ||
      item.farmerName.toLowerCase().includes(q) ||
      item.farmerGroup.toLowerCase().includes(q) ||
      item.commodityName.toLowerCase().includes(q)
    );
  });

  const handleSaveEdit = (updated: TransactionPOItem) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
              <span className="text-[#8A5A19]">MANAJEMEN PENGADAAN</span>
              <span className="text-[#B8B0A0]">•</span>
              <span className="text-[#236B37]">B2B Mitra Tengkulak</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A201A]">
              Transaksi & Surat Pesanan (PO)
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Pantau kontrak pengadaan komoditas, status timbang sawah, surat jalan, dan penerimaan di gudang secara transparan.
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 bg-[#236B37] hover:bg-[#1B552B] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm self-start lg:self-auto cursor-pointer">
            <PlusCircle className="w-4 h-4" />
            Buat PO Baru
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div>
              <div className="text-xs text-[#6D756D] leading-snug">
                Total Kontrak
                <br />
                Berjalan
              </div>
              <div className="text-xl font-extrabold text-[#1A201A] mt-1">
                Rp 161,85 Jt
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
              <div className="text-xl font-extrabold text-[#1A201A] mt-1">
                7,5 Ton
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
                Hari Ini
              </div>
              <div className="text-xl font-extrabold text-[#1A201A] mt-1">
                1 Lokasi
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F3EFE6] text-[#7D5318] flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Filter + Table Wrapper */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
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

          {/* Search & Period Filter Row */}
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
                <span>Periode Muat: Mei 2025</span>
              </div>

              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-semibold text-[#2D332D] transition-colors cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F6F2EA] text-xs font-semibold text-[#5C645C]">
                  <th className="py-3.5 px-4 rounded-l-xl">No. PO & Jadwal</th>
                  <th className="py-3.5 px-4">Petani / Gapoktan</th>
                  <th className="py-3.5 px-4">Komoditas & Nilai</th>
                  <th className="py-3.5 px-4">Armada & Status</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1] text-xs sm:text-sm">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FCFBF8] transition-colors">
                    {/* No. PO & Jadwal */}
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

                    {/* Petani / Gapoktan */}
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

                    {/* Komoditas & Nilai */}
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

                    {/* Armada & Status */}
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

                    {/* Aksi */}
                    <td className="py-4 px-4 align-middle text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#EFECE6] border border-[#E2DACB] text-xs font-semibold text-[#1A201A] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-[#236B37]" />
                          Edit
                        </button>
                        <button
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
        </div>

        {/* Bottom Export & Pagination Bar */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex flex-wrap items-center gap-4">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#E2DACB] text-xs font-semibold text-[#2D332D] transition-colors cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#8A5A19]" />
              Ekspor Laporan (Excel / PDF)
            </button>
            <span className="text-xs text-[#6D756D]">
              Menampilkan 1–{filteredList.length} dari 12 pesanan
            </span>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button className="w-8 h-8 rounded-lg bg-[#FAF8F3] border border-[#ECE6DA] text-[#8E968E] flex items-center justify-center cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#236B37] text-white text-xs font-bold flex items-center justify-center">
              1
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#ECE6DA] text-[#4A524A] text-xs font-semibold flex items-center justify-center cursor-pointer">
              2
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#ECE6DA] text-[#4A524A] text-xs font-semibold flex items-center justify-center cursor-pointer">
              3
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#FAF8F3] hover:bg-[#F3EFE6] border border-[#ECE6DA] text-[#4A524A] flex items-center justify-center cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
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