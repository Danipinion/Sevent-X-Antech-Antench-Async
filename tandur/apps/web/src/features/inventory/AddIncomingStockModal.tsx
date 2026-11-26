import React, { useState } from 'react';
import {
  PlusSquare,
  X,
  LayoutGrid,
  Warehouse,
  Scale,
  Banknote,
  TrendingUp,
  Save,
} from 'lucide-react';

interface AddIncomingStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
}

export const AddIncomingStockModal: React.FC<AddIncomingStockModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [commodity, setCommodity] = useState('Gabah Kering Panen (GKP) - Ciherang Super');
  const [supplier, setSupplier] = useState('Gapoktan Sumber Makmur - Demak');
  const [batchCode, setBatchCode] = useState('#BATCH-TNDR-0519');
  const [receivedTime, setReceivedTime] = useState('24 Okt 2025, 09:30 WIB');
  const [siloLocation, setSiloLocation] = useState('Silo 1 - Karangawen (Sisa Kapasitas: 1.5 Ton dari 20.0 Ton)');
  const [tonnage, setTonnage] = useState<number>(8.5);
  const [yieldPercent, setYieldPercent] = useState<number>(66.5);
  const [buyPrice, setBuyPrice] = useState<number>(6800);
  const [marketRefPrice, setMarketRefPrice] = useState<number>(7200);

  if (!isOpen) return null;

  const totalKg = Math.round(tonnage * 1000);
  const totalBuyCost = totalKg * buyPrice;
  const marginPerKg = marketRefPrice - buyPrice;
  const marginPercent = buyPrice > 0 ? ((marginPerKg / buyPrice) * 100).toFixed(2) : '0.00';
  const netMarginTotal = totalKg * marginPerKg;

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.({
      commodity,
      supplier,
      batchCode,
      receivedTime,
      siloLocation,
      tonnage,
      yieldPercent,
      buyPrice,
      marketRefPrice,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#ECE6DA] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EFEAE0] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0 mt-0.5">
              <PlusSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  Tambah Stok Masuk Gudang
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                  Tera Aktif
                </span>
              </div>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Catat komoditas panen atau gabah yang baru tiba dari penimbangan sawah/mitra petani
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Section 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#236B37]">
              <LayoutGrid className="w-3.5 h-3.5" />
              1. KOMODITAS, VARIETAS & ASAL PASOKAN
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Komoditas & Varietas
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                >
                  <option>Gabah Kering Panen (GKP) - Ciherang Super</option>
                  <option>Gabah Kering Giling (GKG) - Inpari 32</option>
                  <option>Beras Mentik Wangi Organik</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Asal Mitra / Gapoktan Pemasok
                </label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                >
                  <option>Gapoktan Sumber Makmur - Demak</option>
                  <option>Gapoktan Subur Rejo - Guntur</option>
                  <option>Petani Mandiri Ibu Suparni</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Nomor Lot / Kode Batch Timbang
                </label>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-mono font-bold text-[#1A201A] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Waktu Penerimaan & Masuk Gudang
                </label>
                <input
                  type="text"
                  value={receivedTime}
                  onChange={(e) => setReceivedTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-medium text-[#1A201A] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#236B37]">
              <Warehouse className="w-3.5 h-3.5" />
              2. LOKASI PENYIMPANAN & ALOKASI SILO
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Lokasi Penyimpanan (Silo / Blok Gudang)
              </label>
              <select
                value={siloLocation}
                onChange={(e) => setSiloLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              >
                <option>Silo 1 - Karangawen (Sisa Kapasitas: 1.5 Ton dari 20.0 Ton)</option>
                <option>Silo 2 - Karangawen (Sisa Kapasitas: 4.0 Ton dari 16.0 Ton)</option>
                <option>Gudang B - Blok 1 (Sisa Kapasitas: 1.8 Ton dari 5.0 Ton)</option>
              </select>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#236B37]">
              <Scale className="w-3.5 h-3.5" />
              3. STOK FISIK, BOBOT TIMBANG & UJI KADAR AIR
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Total Stok Masuk (Tonase)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={tonnage}
                    onChange={(e) => setTonnage(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    Ton
                  </span>
                </div>
                <p className="text-[11px] text-[#7A827A]">
                  Konversi: {totalKg.toLocaleString('id-ID')} kg netto
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Rendemen Giling Prediksi
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={yieldPercent}
                    onChange={(e) => setYieldPercent(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-[#7A827A]">Grade Mutu Super A</p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#236B37]">
              <Banknote className="w-3.5 h-3.5" />
              4. HARGA BELI TEBAS, ACUAN PASAR & ESTIMASI MARGIN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Harga Tebas Rata-rata (Beli) per kg
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    / kg
                  </span>
                </div>
                <p className="text-[11px] text-[#7A827A]">Harga modal beli dari petani mitra</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Acuan Jual Pasar Demak per kg
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={marketRefPrice}
                    onChange={(e) => setMarketRefPrice(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    / kg
                  </span>
                </div>
                <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#236B37]">
                  <TrendingUp className="w-3 h-3" />
                  Margin: +{formatRupiah(marginPerKg)} / kg (+{marginPercent}%)
                </p>
              </div>
            </div>

            {/* Calculation Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#F6F2EA] rounded-xl p-3.5 border border-[#EDE6D8]">
                <div className="text-[11px] text-[#6D756D]">Total Estimasi Nilai Tebas Transaksi</div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-base font-extrabold text-[#236B37]">
                    {formatRupiah(totalBuyCost)}
                  </span>
                  <span className="text-[10px] text-[#7A827A]">
                    {totalKg.toLocaleString('id-ID')} kg × {formatRupiah(buyPrice)}
                  </span>
                </div>
              </div>

              <div className="bg-[#F6F2EA] rounded-xl p-3.5 border border-[#EDE6D8]">
                <div className="text-[11px] text-[#6D756D]">Status & Estimasi Potensi Margin Bersih</div>
                <div className="mt-1 text-base font-extrabold text-[#8A5A19]">
                  +{formatRupiah(netMarginTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#EFEAE0] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              + Simpan Data Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncomingStockModal;