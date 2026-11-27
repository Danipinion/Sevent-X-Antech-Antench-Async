import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  SlidersHorizontal,
  Tractor,
  MessageSquare,
  ShoppingCart,
  FileText,
  BadgeCheck,
  Send,
  Loader2,
  PackageOpen,
  RefreshCw,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchApi, MiddlemanApi } from '@/services/api';

interface SupplyListing {
  id: string;
  farmer_id?: string;
  farmer_name?: string;
  farmer_group?: string;
  farmer_phone?: string;
  commodity_id?: string;
  commodity_name?: string;
  category?: string;
  title?: string;
  description?: string;
  available_quantity?: number;
  estimated_quantity?: number;
  min_order_quantity?: number;
  unit?: string;
  price_per_unit?: number;
  ready_date?: string;
  pickup_address?: string;
  media_urls?: string[];
  status?: string;
}

const DEFAULT_SUPPLIES: SupplyListing[] = [
  {
    id: 'f85b0bf8-4318-4786-ae0a-f5c99e1d8545',
    farmer_id: '0a853503-09ff-414c-9546-ec5e252161c9',
    farmer_name: 'Pak Sugeng Santoso',
    farmer_group: 'Gapoktan Sumber Makmur',
    farmer_phone: '081399998888',
    commodity_id: '52',
    commodity_name: 'Beras Medium',
    category: 'Beras Medium',
    title: 'Beras Medium (Acuan SP2KP)',
    description: 'Kadar Air (KA): 14.0% • Hampa Kotoran: < 1.0% • Standar Mutu Komoditas SP2KP',
    available_quantity: 8500,
    estimated_quantity: 8500,
    min_order_quantity: 1000,
    unit: 'kg',
    price_per_unit: 14025,
    ready_date: '2026-11-28',
    pickup_address: 'Desa Karangawen, Kab. Demak',
    status: 'published',
  },
  {
    id: 'd94a1d48-3162-4876-9c44-e2d6b38c92a1',
    farmer_id: '0a853503-09ff-414c-9546-ec5e252161c9',
    farmer_name: 'Pak Sugeng Santoso',
    farmer_group: 'Gapoktan Sumber Makmur',
    farmer_phone: '081399998888',
    commodity_id: '51',
    commodity_name: 'Beras Premium',
    category: 'Beras Premium',
    title: 'Beras Premium (Acuan SP2KP)',
    description: 'Derajat Sosoh: 98% • Butir Patah < 5% • Standar Mutu Komoditas SP2KP',
    available_quantity: 3200,
    estimated_quantity: 3200,
    min_order_quantity: 500,
    unit: 'kg',
    price_per_unit: 15710,
    ready_date: '2026-11-28',
    pickup_address: 'Gudang Gapoktan Sumber Makmur, Desa Karangawen, Kab. Demak',
    status: 'published',
  },
  {
    id: 'c72b8341-2e55-4a5f-9271-e94582f0c763',
    farmer_id: 'b0a5f026-51c1-4211-8d71-af3ba699be4c',
    farmer_name: 'Pak Budi Santoso',
    farmer_group: 'Gapoktan Tani Mulya',
    farmer_phone: '081200000001',
    commodity_id: 'd338fe10-dd71-4fb4-affa-5e88d4b1817e',
    commodity_name: 'Jagung Pipil Kering',
    category: 'Palawija',
    title: 'Jagung Pipil Kering Hibrida',
    description: 'Kadar Air Maks 14% • Standar Pakan Ternak • Bebas Aflatoksin',
    available_quantity: 15000,
    estimated_quantity: 15000,
    min_order_quantity: 1000,
    unit: 'kg',
    price_per_unit: 5600,
    ready_date: '2026-11-30',
    pickup_address: 'Desa Bumiharjo, Kab. Grobogan',
    status: 'published',
  },
];

export const FindFarmersPage: React.FC = () => {
  const [supplies, setSupplies] = useState<SupplyListing[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<SupplyListing | null>(null);
  const [selectedCommodityFilter, setSelectedCommodityFilter] = useState<string>('ALL');

  const [tonnage, setTonnage] = useState<number>(1.0);
  const [loadingDate, setLoadingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [extraNote, setExtraNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getAvailableKg = (item: SupplyListing) => {
    const qty = item.available_quantity ?? item.estimated_quantity ?? 500;
    return Number(qty) > 0 ? Number(qty) : 500;
  };

  const loadSupplies = async () => {
    setIsLoading(true);
    try {
      let list: SupplyListing[] = [];
      const endpoints = ['/middleman/listings', '/marketplace/listings', '/farmer/listings'];

      for (const ep of endpoints) {
        try {
          const res = await fetchApi<any>(ep);
          const extracted = Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : null;

          if (extracted && extracted.length > 0) {
            list = extracted;
            break;
          }
        } catch {
          // Lanjut coba endpoint berikutnya
        }
      }

      if (list.length === 0) {
        list = DEFAULT_SUPPLIES;
      }

      setSupplies(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedSupply(first);
        const stockTon = Math.max(0.5, getAvailableKg(first) / 1000);
        const minTon = Math.max(0.5, Number(first.min_order_quantity || 500) / 1000);
        setTonnage(Math.min(stockTon, Math.max(minTon, 1.0)));
        if (first.ready_date) {
          setLoadingDate(first.ready_date.split('T')[0]);
        }
      } else {
        setSelectedSupply(null);
      }
    } catch {
      setSupplies(DEFAULT_SUPPLIES);
      if (DEFAULT_SUPPLIES.length > 0) {
        setSelectedSupply(DEFAULT_SUPPLIES[0]);
      } else {
        setSelectedSupply(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSupplies();
  }, []);

  const availableCategories = useMemo(() => {
    const names = Array.from(
      new Set(supplies.map((s) => s.commodity_name).filter(Boolean))
    ) as string[];
    return ['ALL', ...names];
  }, [supplies]);

  const filteredSupplies = useMemo(() => {
    if (selectedCommodityFilter === 'ALL') return supplies;
    return supplies.filter((s) => s.commodity_name === selectedCommodityFilter);
  }, [supplies, selectedCommodityFilter]);

  const handleCycleFilter = () => {
    if (availableCategories.length <= 1) return;
    const currentIdx = availableCategories.indexOf(selectedCommodityFilter);
    const nextIdx = (currentIdx + 1) % availableCategories.length;
    setSelectedCommodityFilter(availableCategories[nextIdx]);
  };

  const handleSelectSupply = (item: SupplyListing) => {
    setSelectedSupply(item);
    const stockTon = Math.max(0.5, getAvailableKg(item) / 1000);
    const minTon = Math.max(0.5, Number(item.min_order_quantity || 500) / 1000);
    setTonnage(Math.min(stockTon, Math.max(minTon, 1.0)));
    if (item.ready_date) {
      setLoadingDate(item.ready_date.split('T')[0]);
    }
  };

  const activeStockTon = selectedSupply
    ? Math.max(0.5, getAvailableKg(selectedSupply) / 1000)
    : 1.0;

  const activeMinTon = selectedSupply
    ? Math.min(
        activeStockTon,
        Math.max(0.5, Number(selectedSupply.min_order_quantity || 500) / 1000)
      )
    : 0.5;

  const activePricePerKg = selectedSupply ? Number(selectedSupply.price_per_unit || 0) : 0;
  const totalKg = Math.round(tonnage * 1000);
  const totalValue = totalKg * activePricePerKg;

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleSubmitPO = async () => {
    if (!selectedSupply || isSubmitting) return;

    if (totalKg < 500) {
      await Swal.fire({
        icon: 'warning',
        title: 'Bobot Minimal 500 Kg',
        text: 'Kuantitas pesanan borongan minimal adalah 0.5 Ton (500 kg).',
        confirmButtonColor: '#236B37',
      });
      return;
    }

    if (!loadingDate) {
      await Swal.fire({
        icon: 'warning',
        title: 'Tanggal Muat Belum Diisi',
        text: 'Silakan tentukan rencana tanggal penjemputan armada.',
        confirmButtonColor: '#236B37',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sesuai struct domain.CreateOrderOfferInput di OrderService.CreateOffer
      const res = await MiddlemanApi.createPurchaseOrder({
        listing_id: selectedSupply.id,
        offered_quantity: totalKg,
        offered_price: activePricePerKg,
        pickup_date: loadingDate,
        notes: extraNote.trim() || 'Timbang digital bersama di titik muat',
      });

      // Sinkronkan ke local storage agar seketika tampil di tab Transaksi & Pesanan
      try {
        const localList = JSON.parse(localStorage.getItem('tandur_local_po_orders') || '[]');
        const resData = (res as any)?.data || res || {};
        const newPO = {
          id: resData.id || `po-${Date.now()}`,
          po_number: resData.order_code || `PO-TNDR-${Date.now().toString().slice(-4)}`,
          farmer_name: selectedSupply.farmer_name || 'Pak Sugeng Santoso',
          farmer_group: selectedSupply.farmer_group || 'Gapoktan Sumber Makmur',
          commodity_name: selectedSupply.commodity_name || selectedSupply.title,
          pickup_address: selectedSupply.pickup_address,
          offered_quantity: totalKg,
          offered_price: activePricePerKg,
          total_price: totalValue,
          pickup_date: loadingDate,
          notes: extraNote.trim() || 'Timbang digital bersama di titik muat',
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('tandur_local_po_orders', JSON.stringify([newPO, ...localList]));
      } catch {}

      await Swal.fire({
        icon: 'success',
        title: 'Pesanan Borongan (PO) Terkirim',
        text: `Pengajuan ${tonnage.toFixed(1)} Ton ${
          selectedSupply.title || selectedSupply.commodity_name
        } senilai ${formatRupiah(totalValue)} telah dikirim ke ${
          selectedSupply.farmer_name || 'Petani Mitra'
        }.`,
        confirmButtonColor: '#236B37',
      });

      setExtraNote('');
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Mengajukan Pesanan',
        text:
          err?.message ||
          'Terjadi kendala saat mengirim pengajuan PO ke server. Pastikan Anda sudah login.',
        confirmButtonColor: '#236B37',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] font-bold">
                B2B Pengadaan Langsung
              </span>
              <span className="inline-flex items-center gap-1 text-[#8A5A19]">
                <MapPin className="w-3.5 h-3.5" />
                Demak &amp; Grobogan
              </span>
            </div>

            <h1 className="text-2xl sm:text-[28px] font-bold text-[#1A201A] tracking-tight">
              Pasokan Panen Langsung dari Petani
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-2xl leading-relaxed">
              Pesan komoditas borongan langsung dari sawah dan gudang kelompok tani dengan kepastian timbangan dan transparansi harga.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleCycleFilter}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs sm:text-sm font-semibold text-[#1A201A] transition-colors shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#236B37]" />
              Filter Komoditas
            </button>
            <button
              type="button"
              onClick={loadSupplies}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs sm:text-sm font-semibold text-[#1A201A] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Muat ulang daftar pasokan"
            >
              <RefreshCw className={`w-4 h-4 text-[#236B37] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#236B37] animate-spin" />
            <p className="text-sm font-bold text-[#1A201A]">
              Memuat Pasokan Hasil Panen Petani...
            </p>
            <p className="text-xs text-[#6D756D]">
              Mengambil data penawaran panen terbaru yang dipublikasikan petani mitra.
            </p>
          </div>
        ) : filteredSupplies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <PackageOpen className="w-10 h-10 text-[#8A5A19]" />
            <h3 className="text-base font-bold text-[#1A201A]">
              Belum Ada Pasokan Panen Tersedia
            </h3>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-md">
              Saat ini belum ada hasil panen aktif yang dipublikasikan oleh petani mitra. Silakan muat ulang secara berkala.
            </p>
            <button
              type="button"
              onClick={loadSupplies}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Muat Ulang Data
            </button>
          </div>
        ) : (
          /* Main 2-Column Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Info Petani Terpilih + Daftar Pasokan */}
            <div className="lg:col-span-7 space-y-6">
              {selectedSupply && (
                <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
                      <Tractor className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-[#1A201A]">
                        {selectedSupply.farmer_group || 'Gapoktan Sumber Makmur'}
                      </h2>
                      <p className="text-xs font-semibold text-[#6D756D]">
                        {selectedSupply.farmer_name || 'Pak Sugeng Santoso'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[#8A5A19] pt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{selectedSupply.pickup_address || 'Desa Karangawen, Kab. Demak'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#555D55]">
                      Akses Truk: CDD / Fuso di Jalan Usaha Tani Karangawen
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          Swal.fire({
                            icon: 'info',
                            title: 'Kontak Petani Mitra',
                            text: `${selectedSupply.farmer_name || 'Petani'}: ${
                              selectedSupply.farmer_phone || '081399998888'
                            }`,
                            confirmButtonColor: '#236B37',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5DCD5] hover:bg-[#EAF4EC] text-[#236B37] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Hubungi Petani
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          Swal.fire({
                            icon: 'info',
                            title: 'Lokasi Titik Muat Lahan',
                            text: selectedSupply.pickup_address || 'Desa Karangawen, Kab. Demak',
                            confirmButtonColor: '#236B37',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DEC9] hover:bg-[#F4EFE6] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cek Lokasi Lahan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#1A201A]">
                  <span className="text-[#236B37] font-extrabold text-lg">#</span>
                  <h3>Daftar Pasokan Siap Borong</h3>
                </div>
                <span className="text-xs font-medium text-[#6D756D]">
                  {filteredSupplies.length} Komoditas Tersedia
                </span>
              </div>

              <div className="space-y-4">
                {filteredSupplies.map((item) => {
                  const isSelected = selectedSupply?.id === item.id;
                  const stockTon = (getAvailableKg(item) / 1000)
                    .toFixed(1)
                    .replace('.', ',');
                  const minTon = (Math.max(500, Number(item.min_order_quantity || 500)) / 1000)
                    .toFixed(1)
                    .replace('.', ',');
                  const priceKg = Number(item.price_per_unit || 0);

                  const categoryTag = item.category
                    ? `${item.category.toUpperCase()} • ${item.ready_date ? 'SIAP PANEN 3 HARI' : 'READY DI GUDANG'}`
                    : 'PADI SAWAH • SIAP PANEN 3 HARI';

                  const badgeRight = item.min_order_quantity
                    ? `Min. ${minTon} Ton`
                    : item.unit === 'kg' && priceKg > 10000
                    ? 'Karung 50 Kg'
                    : `Min. ${minTon} Ton`;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-5 sm:p-6 space-y-3.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.015)] ${
                        isSelected
                          ? 'border-[#236B37] ring-1 ring-[#236B37]/30'
                          : 'border-[#ECE6DA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-[#236B37]">
                          {categoryTag}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4EC] text-[#236B37] text-[11px] font-bold">
                          {badgeRight}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-[#1A201A]">
                          {item.title || item.commodity_name || 'Hasil Panen Petani'}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-[#236B37]">
                            {formatRupiah(priceKg)}
                          </span>
                          <span className="text-xs text-[#7A827A]">/ {item.unit || 'kg'}</span>
                          <span className="text-xs font-semibold text-[#8A5A19]">
                            • Tersedia {stockTon} Ton
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <div className="text-xs text-[#555D55] leading-relaxed">
                          {item.description}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleSelectSupply(item)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {isSelected ? 'Pilih & Buat Pesanan' : 'Pilih & Buat Pesanan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (5 cols): Sticky Order Borongan (PO) Card */}
            {selectedSupply && (
              <div className="lg:col-span-5 lg:sticky lg:top-6 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1A201A]">
                        Order Borongan (PO)
                      </h2>
                      <p className="text-xs text-[#6D756D]">Pengadaan Resmi Skala B2B</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                    Surat Pesanan
                  </span>
                </div>

                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A5A19]">
                      KOMODITAS YANG DIPESAN
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1A201A] mt-0.5">
                      {selectedSupply.title || selectedSupply.commodity_name}
                    </div>
                    <div className="text-xs font-bold text-[#236B37] mt-0.5">
                      {formatRupiah(activePricePerKg)} / {selectedSupply.unit || 'kg'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E5DEC9] text-[11px] font-semibold text-[#4A524A] shrink-0">
                    Petani: {selectedSupply.farmer_name ? selectedSupply.farmer_name.replace('Santoso', '').trim() : 'Pak Sugeng'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-[#1A201A]">Kuantitas Tonase</span>
                    <div>
                      <span className="text-lg font-bold text-[#1A201A]">
                        {tonnage.toFixed(1)}
                      </span>{' '}
                      <span className="text-xs font-semibold text-[#1A201A]">
                        Ton ({totalKg.toLocaleString('id-ID')} kg)
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={activeMinTon}
                    max={activeStockTon}
                    step={0.1}
                    value={tonnage}
                    onChange={(e) => setTonnage(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#E6DFD2] rounded-lg appearance-none cursor-pointer accent-[#236B37]"
                  />

                  <div className="flex items-center justify-between text-[11px] text-[#7A827A]">
                    <span>Minimal: {activeMinTon.toFixed(1)} Ton</span>
                    <span>Maksimum: {activeStockTon.toFixed(1)} Ton</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#555D55]">
                      Rencana Tanggal Muat
                    </label>
                    <input
                      type="date"
                      value={loadingDate}
                      onChange={(e) => setLoadingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-[#555D55]">
                      Instruksi Tambahan
                    </label>
                    <input
                      type="text"
                      value={extraNote}
                      onChange={(e) => setExtraNote(e.target.value)}
                      placeholder="Timbang bersama mandor"
                      className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                    />
                  </div>
                </div>

                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6D756D]">Subtotal Harga Pasokan</span>
                    <span className="font-bold text-[#1A201A]">{formatRupiah(totalValue)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E6DFD2] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#8A5A19]">
                        Total Nilai Pesanan (PO)
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-[#236B37]">
                        {formatRupiah(totalValue)}
                      </div>
                    </div>
                    <BadgeCheck className="w-6 h-6 text-[#236B37]" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitPO}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Mengajukan PO...' : 'Ajukan Pesanan Borongan'}
                  </button>
                  <p className="text-[11px] text-[#7A827A]">
                    Petani akan mengonfirmasi jadwal penimbangan dan surat jalan resmi.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindFarmersPage;