import { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Wheat,
  Wallet,
  Star,
  Search,
  Calendar,
  ArrowUpDown,
  MessageSquare,
  Clock,
  Grip,
  Archive,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { fetchApi, type FarmerPurchaseOrder } from '@/services/api';

type OrderTab = 'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled';

export default function FarmerOrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setOrders] = useState<FarmerPurchaseOrder[]>([]);

  // Fetch pesanan panen dari API backend (/orders)
  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        const res = await fetchApi<{ data?: FarmerPurchaseOrder[] } | FarmerPurchaseOrder[]>('/orders');
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        if (isMounted && list.length > 0) {
          setOrders(list);
        }
      } catch {
        // Fallback aman
      }
    }
    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const tabs: { id: OrderTab; label: string; count: number }[] = [
    { id: 'all', label: 'Semua Pesanan', count: 14 },
    { id: 'pending', label: 'Menunggu Konfirmasi', count: 3 },
    { id: 'scheduled', label: 'Dijadwalkan Dijemput', count: 2 },
    { id: 'completed', label: 'Selesai & Lunas', count: 9 },
    { id: 'cancelled', label: 'Dibatalkan', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Schedule Banner Alert */}
        <div className="rounded-2xl border border-[#EFECE6] bg-[#F7F4EC] p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-[#1C241E]">
                  Jadwal Timbang &amp; Muat Terdekat
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#FADEC9] text-[#9A4D16] text-[11px] font-bold">
                  Besok Pagi
                </span>
              </div>
              <p className="text-xs text-[#5C635E] mt-0.5">
                Truk armada CV Berkah Pangan Nusantara dijadwalkan tiba di lumbung Demak pukul 09.00 WIB.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E2DA] hover:bg-[#FAF8F4] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#156E33]" />
              Bagikan Titik Jemput
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Siap Muat
            </button>
          </div>
        </div>

        {/* Page Header + Metric Summary Cards */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#156E33]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#156E33]">
                MANAJEMEN TRANSAKSI PANEN
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
              Daftar Pesanan &amp; Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-[#5C635E] leading-relaxed">
              Pantau penawaran tengkulak yang masuk, jadwal armada logistik penjemputan, serta
              status timbang dan transfer dana langsung ke rekening Anda.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white rounded-2xl border border-[#EFECE6] px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A827C]">Total Bulan Ini</p>
                <p className="text-sm sm:text-base font-extrabold text-[#1C241E]">
                  Rp 188.000.000
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFECE6] px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-[#D97706]" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A827C]">Skor Mitra</p>
                <p className="text-sm sm:text-base font-extrabold text-[#1C241E]">
                  4.9 <span className="text-xs font-medium text-[#7A827C]">/ 5.0</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#156E33] text-white shadow-2xs'
                    : 'bg-white border border-[#EFECE6] text-[#5C635E] hover:bg-[#F7F4EC]'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'pending' || tab.id === 'scheduled'
                      ? 'bg-[#FADEC9] text-[#9A4D16]'
                      : tab.id === 'completed'
                      ? 'bg-[#E8F5EC] text-[#156E33]'
                      : 'bg-[#F2EFE9] text-[#7A827C]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl border border-[#EFECE6] p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9AA19C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor transaksi, nama pembeli, atau komoditas..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F6F1] text-xs sm:text-sm text-[#1C241E] placeholder:text-[#9AA19C] outline-none focus:ring-1 focus:ring-[#156E33]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F6F1] hover:bg-[#EFECE6] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#5C635E]" />
              Bulan: Februari 2025
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F6F1] hover:bg-[#EFECE6] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5C635E]" />
              Terbaru Masuk
            </button>
          </div>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4">
          {/* Card 1: Armada Menuju Lokasi */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] border-l-4 border-l-[#D97706] p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F2EFE9]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FADEC9] text-[#9A4D16] font-bold">
                  <Truck className="w-3.5 h-3.5" />
                  Armada Menuju Lokasi
                </span>
                <span className="font-semibold text-[#7A827C]">#TND-ORD-2025-0881</span>
                <span className="text-[#9AA19C]">• Dibuat 12 Feb 2025, 14:20 WIB</span>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-[#7A827C]">Nilai Kesepakatan</p>
                <p className="text-lg sm:text-xl font-extrabold text-[#1C241E]">Rp 62.050.000</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Col 1: Komoditas */}
              <div className="md:col-span-5 flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                  <Wheat className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#156E33]">
                    KOMODITAS UTAMA
                  </span>
                  <h3 className="text-base font-bold text-[#1C241E]">
                    Gabah Kering Panen (GKP)
                  </h3>
                  <p className="text-xs text-[#7A827C]">
                    Varietas Ciherang • Panen Musim Rendeng
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#F5F2EB] font-bold text-[#1C241E]">
                      Volume: 8.5 Ton
                    </span>
                    <span className="text-[#7A827C]">@ Rp 7.300 / kg</span>
                  </div>
                </div>
              </div>

              {/* Col 2: Pembeli Terdaftar */}
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                  PEMBELI TERDAFTAR
                </span>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#1C241E]">
                    CV Berkah Pangan Nusantara
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0" />
                </div>
                <p className="text-xs text-[#5C635E]">Kudus, Jawa Tengah • Reputasi 4.9 ★</p>
                <p className="text-xs text-[#7A827C]">Gudang Distribusi Padi Regional</p>
              </div>

              {/* Col 3: Jadwal Armada */}
              <div className="md:col-span-3 rounded-xl bg-[#F8F6F1] p-3.5 space-y-1">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9A4D16]">
                  <Clock className="w-3.5 h-3.5" />
                  Jadwal Tiba Armada
                </p>
                <p className="text-xs font-bold text-[#1C241E]">Besok, 09.00 - 11.00 WIB</p>
                <p className="text-[11px] text-[#7A827C]">Truk Isuzu Elf (AD 8291 QA)</p>
                <p className="text-[11px] text-[#7A827C]">Sopir: Pak Suparno</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Hubungi Pembeli
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Konfirmasi Muat
              </button>
            </div>
          </div>

          {/* Card 2: Menunggu Persetujuan Anda */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] border-l-4 border-l-[#EAB308] p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F2EFE9]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#92400E] font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  Menunggu Persetujuan Anda
                </span>
                <span className="font-semibold text-[#7A827C]">#TND-ORD-2025-0894</span>
                <span className="text-[#9AA19C]">• Penawaran Masuk 45 Menit Lalu</span>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-[#7A827C]">Total Penawaran Pembeli</p>
                <p className="text-lg sm:text-xl font-extrabold text-[#1C241E]">Rp 28.750.000</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Col 1 */}
              <div className="md:col-span-5 flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                  <Grip className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                    KOMODITAS PENAWARAN
                  </span>
                  <h3 className="text-base font-bold text-[#1C241E]">
                    Jagung Pipil Kering Hibrida
                  </h3>
                  <p className="text-xs text-[#7A827C]">
                    Kadar Air Maks 14% • Standar Pakan Ternak
                  </p>
                  <div className="pt-1">
                    <span className="px-2 py-0.5 rounded bg-[#F5F2EB] text-xs font-bold text-[#1C241E]">
                      Kuantitas: 5.0 Ton (5.000 Kg)
                    </span>
                  </div>
                </div>
              </div>

              {/* Col 2 */}
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                  PEMBELI TERDAFTAR
                </span>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#1C241E]">
                    PT Sentosa Pakan Ternak Jatim
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0" />
                </div>
                <p className="text-xs text-[#5C635E]">
                  Sidoarjo • Pembeli Kontrak Skala Menengah
                </p>
                <p className="flex items-center gap-1 text-xs font-semibold text-[#156E33] pt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Harga Ditawarkan Rp 150/kg Di Atas Rata-rata Pasar
                </p>
              </div>

              {/* Col 3: Price Detail */}
              <div className="md:col-span-3 rounded-xl bg-[#F8F6F1] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7A827C]">Harga Ajuan</span>
                  <span className="font-bold text-[#1C241E]">Rp 5.750</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A827C]">Harga Acuan Bapanas</span>
                  <span className="text-[#5C635E]">Rp 5.600 / kg</span>
                </div>
                <div className="pt-1.5 border-t border-[#EAE6DC] flex justify-between font-bold">
                  <span className="text-[#1C241E]">Estimasi Margin Bersih</span>
                  <span className="text-[#156E33]">+Rp 750.000</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
              >
                Negosiasi
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terima Penawaran &amp; Jadwalkan
              </button>
            </div>
          </div>

          {/* Card 3: Transaksi Selesai & Lunas */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] border-l-4 border-l-[#156E33] p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F2EFE9]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Transaksi Selesai &amp; Lunas
                </span>
                <span className="font-semibold text-[#7A827C]">#TND-ORD-2025-0842</span>
                <span className="text-[#9AA19C]">• Selesai 09 Feb 2025</span>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-[#7A827C]">Total Dana Diterima</p>
                <p className="text-lg sm:text-xl font-extrabold text-[#156E33]">Rp 97.200.000</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Col 1 */}
              <div className="md:col-span-5 flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#156E33]">
                    KOMODITAS DITRANSAKSIKAN
                  </span>
                  <h3 className="text-base font-bold text-[#1C241E]">
                    Gabah Kering Giling (GKG)
                  </h3>
                  <p className="text-xs text-[#7A827C]">
                    Kualitas Premium • Kadar Air Terverifikasi 13.6%
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#F5F2EB] font-bold text-[#1C241E]">
                      Timbangan Akhir: 12.040 Kg
                    </span>
                    <span className="text-[#7A827C]">@ Rp 8.100 / kg</span>
                  </div>
                </div>
              </div>

              {/* Col 2 */}
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                  PEMBELI TERDAFTAR
                </span>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#1C241E]">
                    Koperasi Tani Makmur Sejahtera
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0" />
                </div>
                <p className="text-xs text-[#5C635E]">Grobogan • Rekanan Bulog Terdaftar</p>
                <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-[#7A827C]">
                  <span className="px-2 py-0.5 rounded bg-[#F5F2EB]">No. Timbang #WB-8921-A</span>
                  <span className="px-2 py-0.5 rounded bg-[#F5F2EB]">Ref: TRF-881923</span>
                </div>
              </div>

              {/* Col 3 */}
              <div className="md:col-span-3 rounded-xl bg-[#F8F6F1] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7A827C]">Harga Ajuan</span>
                  <span className="font-bold text-[#1C241E]">Rp 5.750</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A827C]">Harga Acuan Bapanas</span>
                  <span className="text-[#5C635E]">Rp 5.600 / kg</span>
                </div>
                <div className="pt-1.5 border-t border-[#EAE6DC] flex justify-between font-bold">
                  <span className="text-[#1C241E]">Estimasi Margin Bersih</span>
                  <span className="text-[#156E33]">+Rp 750.000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Transaksi Selesai (History) */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-4 opacity-90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F2EFE9]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F2EFE9] text-[#5C635E] font-bold">
                  Transaksi Selesai
                </span>
                <span className="font-semibold text-[#7A827C]">#TND-ORD-2025-0799</span>
                <span className="text-[#9AA19C]">• Selesai 28 Jan 2025</span>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-[#7A827C]">Total Nilai Bersih</p>
                <p className="text-base sm:text-lg font-extrabold text-[#1C241E]">Rp 28.000.000</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2EB] text-[#7A827C] flex items-center justify-center shrink-0">
                  <Grip className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                    KOMODITAS PANEN LALU
                  </span>
                  <h3 className="text-sm font-bold text-[#1C241E]">
                    Jagung Pipil Kering Super
                  </h3>
                  <p className="text-xs text-[#7A827C]">
                    Kadar Air 14.1% • Bobot Timbang 5.000 Kg
                  </p>
                </div>
              </div>

              <div className="md:col-span-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                  PEMBELI TERDAFTAR
                </span>
                <h4 className="text-sm font-bold text-[#1C241E]">CV Surya Ternak Berdikari</h4>
                <p className="text-xs text-[#7A827C]">
                  Boyolali • Lunas via Virtual Account Mandiri
                </p>
              </div>

              <div className="md:col-span-3 rounded-xl bg-[#F8F6F1] p-3 text-xs space-y-1">
                <p className="text-[11px] font-semibold text-[#7A827C]">Ulasan Pembeli</p>
                <div className="flex items-center gap-0.5 text-[#D97706]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D97706]" />
                  ))}
                </div>
                <p className="text-[11px] italic text-[#5C635E]">
                  "Kualitas pipil bersih, penimbangan sangat tepat."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}