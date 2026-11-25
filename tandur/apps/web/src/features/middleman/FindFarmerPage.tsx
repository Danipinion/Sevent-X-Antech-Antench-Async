import { useState } from 'react';
import {
  MapPin,
  SlidersHorizontal,
  Tractor,
  Truck,
  MessageSquare,
  LayoutGrid,
  ShoppingCart,
  FileText,
  BadgeCheck,
  Send,
} from 'lucide-react';

interface SupplyCommodity {
  id: string;
  tag: string;
  badgeText: string;
  name: string;
  shortName: string;
  pricePerKg: number;
  stockTon: number;
  minTon: number;
  spec1Label: string;
  spec1Value: string;
  spec2Label: string;
  spec2Value: string;
}

const SUPPLY_LIST: SupplyCommodity[] = [
  {
    id: 'sup-1',
    tag: 'PADI SAWAH • SIAP PANEN 3 HARI',
    badgeText: 'Min. 1.0 Ton',
    name: 'Gabah Kering Panen (GKP) Ciherang',
    shortName: 'GKP Ciherang',
    pricePerKg: 6800,
    stockTon: 8.5,
    minTon: 1.0,
    spec1Label: 'Kadar Air (KA):',
    spec1Value: '21.0%',
    spec2Label: 'Hampa Kotoran:',
    spec2Value: '< 2.8%',
  },
  {
    id: 'sup-2',
    tag: 'BERAS BERKUALITAS • READY DI GUDANG',
    badgeText: 'Karung 50 Kg',
    name: 'Beras Mentik Wangi Susu Organik',
    shortName: 'Beras Mentik Wangi',
    pricePerKg: 13500,
    stockTon: 2.2,
    minTon: 0.5,
    spec1Label: 'Derajat Sosoh:',
    spec1Value: '95%',
    spec2Label: 'Aroma Wangi:',
    spec2Value: 'Alami Tanpa Esens',
  },
];

export const FindFarmersPage: React.FC = () => {
  const [selectedCommodity, setSelectedCommodity] = useState<SupplyCommodity>(SUPPLY_LIST[0]);
  const [tonnage, setTonnage] = useState<number>(5.0);
  const [loadingDate, setLoadingDate] = useState<string>('05/16/2025');
  const [extraNote, setExtraNote] = useState<string>('Timbang bersama mandor');

  const handleSelectCommodity = (item: SupplyCommodity) => {
    setSelectedCommodity(item);
    setTonnage(Math.min(5.0, item.stockTon));
  };

  const totalKg = Math.round(tonnage * 1000);
  const totalValue = totalKg * selectedCommodity.pricePerKg;
  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

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
                Demak & Grobogan
              </span>
            </div>

            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#1A201A] tracking-tight">
              Pasokan Panen Langsung dari Petani
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-2xl leading-relaxed">
              Pesan komoditas borongan langsung dari sawah dan gudang kelompok tani dengan kepastian timbangan dan transparansi harga.
            </p>
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs sm:text-sm font-semibold text-[#1A201A] transition-colors self-start lg:self-auto shadow-xs cursor-pointer">
            <SlidersHorizontal className="w-4 h-4 text-[#236B37]" />
            Filter Varietas
          </button>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Gapoktan Card + Supply List */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gapoktan Profile Card */}
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
                  <Tractor className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-extrabold text-[#1A201A]">
                    Gapoktan Sumber Makmur
                  </h2>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#F6EDE0] text-[#8A5A19] text-xs font-bold">
                    Pak Sugeng Santoso
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6D756D] pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8A5A19]" />
                    <span>Desa Karangawen, Kab. Demak</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-[#555D55]">
                  <Truck className="w-4 h-4 text-[#236B37] shrink-0 mt-0.5" />
                  <span>Akses Truk CDD / Fuso di Jalan Usaha Tani Karangawen</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAF4EC] hover:bg-[#DCF0E0] text-[#236B37] text-xs font-bold transition-colors cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Hubungi Petani
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4EFE6] hover:bg-[#E8E0D1] text-[#2D332D] text-xs font-bold transition-colors cursor-pointer">
                    Cek Lokasi Lahan
                  </button>
                </div>
              </div>
            </div>

            {/* Section Header: Daftar Pasokan Siap Borong */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-extrabold text-[#1A201A]">
                <LayoutGrid className="w-4 h-4 text-[#236B37]" />
                <h3>Daftar Pasokan Siap Borong</h3>
              </div>
              <span className="text-xs font-medium text-[#6D756D]">
                2 Komoditas Tersedia
              </span>
            </div>

            {/* Commodity Supply Cards */}
            <div className="space-y-4">
              {SUPPLY_LIST.map((item) => {
                const isSelected = selectedCommodity.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.015)] ${
                      isSelected ? 'border-[#236B37] ring-1 ring-[#236B37]/20' : 'border-[#ECE6DA]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-[#8A5A19]">
                        {item.tag}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4EC] text-[#236B37] text-[11px] font-bold">
                        {item.badgeText}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base sm:text-lg font-extrabold text-[#1A201A]">
                        {item.name}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-extrabold text-[#236B37]">
                          {formatRupiah(item.pricePerKg)}
                        </span>
                        <span className="text-xs text-[#7A827A]">/ kg</span>
                        <span className="text-xs font-semibold text-[#8A5A19]">
                          • {item.id === 'sup-1' ? `Tersedia ${item.stockTon} Ton` : `Stok ${item.stockTon} Ton`}
                        </span>
                      </div>
                    </div>

                    {/* Spec Strip */}
                    <div className="bg-[#F6F2EA] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[#6D756D]">{item.spec1Label} </span>
                        <strong className="text-[#1A201A]">{item.spec1Value}</strong>
                      </div>
                      <div>
                        <span className="text-[#6D756D]">{item.spec2Label} </span>
                        <strong className="text-[#1A201A]">{item.spec2Value}</strong>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSelectCommodity(item)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Pilih & Buat Pesanan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (5 cols): Sticky Order Borongan (PO) Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A201A]">
                    Order Borongan (PO)
                  </h2>
                  <p className="text-xs text-[#6D756D]">Pengadaan Resmi Skala B2B</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                Surat Pesanan
              </span>
            </div>

            {/* Selected Commodity Box */}
            <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A5A19]">
                  KOMODITAS YANG DIPESAN
                </div>
                <div className="text-sm sm:text-base font-extrabold text-[#1A201A] mt-0.5">
                  {selectedCommodity.shortName}
                </div>
                <div className="text-xs font-bold text-[#236B37] mt-0.5">
                  {formatRupiah(selectedCommodity.pricePerKg)} / kg
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E5DEC9] text-[11px] font-semibold text-[#4A524A]">
                Petani: Pak Sugeng
              </span>
            </div>

            {/* Kuantitas Tonase Slider */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-[#1A201A]">Kuantitas Tonase</span>
                <div>
                  <span className="text-lg font-extrabold text-[#236B37]">
                    {tonnage.toFixed(1)}
                  </span>{' '}
                  <span className="text-xs text-[#6D756D]">
                    Ton ({totalKg.toLocaleString('id-ID')} kg)
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={selectedCommodity.minTon}
                max={selectedCommodity.stockTon}
                step={0.1}
                value={tonnage}
                onChange={(e) => setTonnage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#E6DFD2] rounded-lg appearance-none cursor-pointer accent-[#236B37]"
              />

              <div className="flex items-center justify-between text-[11px] text-[#7A827A]">
                <span>Minimal: {selectedCommodity.minTon.toFixed(1)} Ton</span>
                <span>Maksimum: {selectedCommodity.stockTon.toFixed(1)} Ton</span>
              </div>
            </div>

            {/* Date & Extra Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#555D55]">
                  Rencana Tanggal Muat
                </label>
                <input
                  type="text"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Total Calculation Box */}
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
                  <div className="text-lg sm:text-xl font-extrabold text-[#236B37]">
                    {formatRupiah(totalValue)}
                  </div>
                </div>
                <BadgeCheck className="w-6 h-6 text-[#236B37]" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2 text-center">
              <button className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer">
                <Send className="w-4 h-4" />
                Ajukan Pesanan Borongan
              </button>
              <p className="text-[11px] text-[#7A827A]">
                Petani akan mengonfirmasi jadwal penimbangan dan surat jalan resmi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindFarmersPage;