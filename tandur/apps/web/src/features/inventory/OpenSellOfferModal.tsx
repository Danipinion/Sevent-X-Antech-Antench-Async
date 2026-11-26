import React, { useState } from 'react';
import {
  Store,
  X,
  TrendingUp,
  Info,
  Sparkles,
} from 'lucide-react';

interface LotOption {
  id: string;
  siloLabel: string;
  name: string;
  availableTon: number;
  subText: string;
  costLabel: string;
  costPerKg: number;
  marketRefPerKg: number;
}

const LOT_OPTIONS: LotOption[] = [
  {
    id: 'lot-1',
    siloLabel: 'SILO 1 KARANGAWEN',
    name: 'GKP Ciherang',
    availableTon: 15.0,
    subText: 'Tersedia: 15.0 Ton',
    costLabel: 'Modal Tebas:',
    costPerKg: 6800,
    marketRefPerKg: 7200,
  },
  {
    id: 'lot-2',
    siloLabel: 'SILO 2 KARANGAWEN',
    name: 'GKG Inpari 32',
    availableTon: 10.0,
    subText: 'Tersedia: 10.0 Ton',
    costLabel: 'Modal Tebas:',
    costPerKg: 7850,
    marketRefPerKg: 8400,
  },
  {
    id: 'lot-3',
    siloLabel: 'GUDANG B BLOK 1',
    name: 'Beras IR-64',
    availableTon: 3.2,
    subText: 'Tersedia: 3.2 Ton (64 Sak)',
    costLabel: 'Modal Bersih:',
    costPerKg: 11200,
    marketRefPerKg: 12400,
  },
];

interface OpenSellOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish?: (data: any) => void;
}

export const OpenSellOfferModal: React.FC<OpenSellOfferModalProps> = ({
  isOpen,
  onClose,
  onPublish,
}) => {
  const [selectedLot, setSelectedLot] = useState<LotOption>(LOT_OPTIONS[0]);
  const [offerTon, setOfferTon] = useState<number>(10.0);
  const [minOrderTon, setMinOrderTon] = useState<number>(2.0);
  const [offerPrice, setOfferPrice] = useState<number>(7250);
  const [pickupMethod, setPickupMethod] = useState<'fob' | 'cdd'>('fob');
  const [targets, setTargets] = useState({
    riceMill: true,
    wholesaler: true,
    openB2B: false,
  });
  const [validity, setValidity] = useState('3 Hari (Rekomendasi Pasar Aktif)');

  if (!isOpen) return null;

  const handleSelectLot = (lot: LotOption) => {
    setSelectedLot(lot);
    setOfferTon(Math.min(10.0, lot.availableTon));
    setOfferPrice(lot.marketRefPerKg + 50);
  };

  const remainingTon = Math.max(0, selectedLot.availableTon - offerTon);
  const totalKg = Math.round(offerTon * 1000);
  const grossValue = totalKg * offerPrice;
  const marginPerKg = offerPrice - selectedLot.costPerKg;
  const marginPercent = ((marginPerKg / selectedLot.costPerKg) * 100).toFixed(1);
  const netProfit = totalKg * marginPerKg;

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPublish?.({
      selectedLot,
      offerTon,
      minOrderTon,
      offerPrice,
      pickupMethod,
      targets,
      validity,
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
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  Buka Penawaran Jual Baru
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                  Listing Pasar
                </span>
              </div>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Tawarkan stok komoditas gudang/silo Anda ke mitra pabrik beras (rice mill) dan pedagang grosir terverifikasi.
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
          {/* 1. Pilih Komoditas */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1A201A]">1. Pilih Komoditas dari Stok Tersedia</span>
              <span className="text-[11px] text-[#7A827A]">Total 3 Lot Siap Jual</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOT_OPTIONS.map((lot) => {
                const isSelected = selectedLot.id === lot.id;
                return (
                  <button
                    type="button"
                    key={lot.id}
                    onClick={() => handleSelectLot(lot)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3F9F4] border-[#236B37] ring-1 ring-[#236B37]'
                        : 'bg-[#FAF8F3] border-[#E5DEC9] hover:border-[#C5BCA8]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#7A827A]">
                        {lot.siloLabel}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#236B37]' : 'border-[#C5BCA8]'
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#236B37]" />}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#1A201A] mt-1">
                      {lot.name}
                    </div>
                    <div className="text-[11px] text-[#6D756D] mt-0.5">{lot.subText}</div>
                    <div className="mt-3 pt-2 border-t border-[#E6DFD2] flex items-center justify-between text-[10px]">
                      <span className="text-[#7A827A]">{lot.costLabel}</span>
                      <strong className="text-[#1A201A]">{formatRupiah(lot.costPerKg)}/kg</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tonase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1A201A]">2. Tonase yang Ditawarkan</span>
                <span className="text-[11px] text-[#7A827A]">
                  Maks: {selectedLot.availableTon.toFixed(1)} Ton
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  max={selectedLot.availableTon}
                  value={offerTon}
                  onChange={(e) => setOfferTon(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                  Ton
                </span>
              </div>
              <p className="text-[11px] text-[#7A827A]">
                Sisa di silo setelah listing: {remainingTon.toFixed(1)} Ton
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1A201A]">Minimal Order Pembelian</span>
                <span className="text-[11px] text-[#7A827A]">Fleksibel</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={minOrderTon}
                  onChange={(e) => setMinOrderTon(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                  Ton
                </span>
              </div>
              <p className="text-[11px] text-[#7A827A]">Mencegah pembelian eceran kecil</p>
            </div>
          </div>

          {/* 3. Penetapan Harga & Smart Margin */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#1A201A]">3. Penetapan Harga & Smart Margin</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A5A19]">
                <TrendingUp className="w-3.5 h-3.5" />
                Acuan Pasar Demak: {formatRupiah(selectedLot.marketRefPerKg)} / kg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
              <div className="sm:col-span-5 space-y-1">
                <label className="block text-[11px] text-[#6D756D]">
                  Harga Penawaran / kg
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#236B37]">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-10 py-3 rounded-xl bg-[#F3F9F4] border border-[#236B37] text-sm font-bold text-[#1A201A] focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                    /kg
                  </span>
                </div>
              </div>

              <div className="sm:col-span-7 bg-[#FAF8F3] rounded-xl p-3.5 border border-[#E5DEC9] flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#6D756D]">
                    Modal Tebas: {formatRupiah(selectedLot.costPerKg)}/kg
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#E1F3E5] text-[#236B37] font-bold">
                    Margin +{formatRupiah(marginPerKg)}/kg (+{marginPercent}%)
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-[#EAE2D3] flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-[#7A827A]">Nilai Kotor Transaksi</div>
                    <div className="text-sm font-bold text-[#1A201A]">
                      {formatRupiah(grossValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#7A827A]">Estimasi Laba Bersih</div>
                    <div className="text-sm font-bold text-[#236B37]">
                      +{formatRupiah(netProfit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Opsi Pengambilan & Logistik */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#1A201A]">
              4. Opsi Pengambilan & Logistik
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPickupMethod('fob')}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  pickupMethod === 'fob'
                    ? 'bg-[#F3F9F4] border-[#236B37]'
                    : 'bg-[#FAF8F3] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A201A]">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      pickupMethod === 'fob' ? 'border-[#236B37]' : 'border-[#B8B0A0]'
                    }`}
                  >
                    {pickupMethod === 'fob' && (
                      <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                    )}
                  </span>
                  Ambil di Silo/Gudang (FOB Silo)
                </div>
                <p className="text-[11px] text-[#6D756D] mt-1 pl-5">
                  Truk dan tenaga muat ditanggung pembeli sendiri
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPickupMethod('cdd')}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  pickupMethod === 'cdd'
                    ? 'bg-[#F3F9F4] border-[#236B37]'
                    : 'bg-[#FAF8F3] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A201A]">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      pickupMethod === 'cdd' ? 'border-[#236B37]' : 'border-[#B8B0A0]'
                    }`}
                  >
                    {pickupMethod === 'cdd' && (
                      <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                    )}
                  </span>
                  Kirim Armada CDD Tengkulak
                </div>
                <p className="text-[11px] text-[#6D756D] mt-1 pl-5">
                  Biaya angkut ditambahkan terpisah ke invoice pembeli
                </p>
              </button>
            </div>
          </div>

          {/* 5 & 6 Target Pasar & Masa Berlaku */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1A201A]">
                5. Target Pasar yang Diberitahu
              </div>
              <div className="space-y-2 text-xs text-[#2D332D]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets.riceMill}
                    onChange={(e) => setTargets({ ...targets, riceMill: e.target.checked })}
                    className="rounded accent-[#236B37]"
                  />
                  <span>Pabrik Beras / Modern Rice Mill (18 Mitra)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets.wholesaler}
                    onChange={(e) => setTargets({ ...targets, wholesaler: e.target.checked })}
                    className="rounded accent-[#236B37]"
                  />
                  <span>Pedagang Grosir Pasar Bintoro & Karanganyar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets.openB2B}
                    onChange={(e) => setTargets({ ...targets, openB2B: e.target.checked })}
                    className="rounded accent-[#236B37]"
                  />
                  <span>Pembeli Terbuka di Portal Tandur B2B</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1A201A]">
                6. Masa Berlaku Penawaran
              </div>
              <select
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              >
                <option>3 Hari (Rekomendasi Pasar Aktif)</option>
                <option>7 Hari (Kontrak Mingguan)</option>
                <option>24 Jam (Penawaran Kilat)</option>
              </select>
              <div className="flex items-center gap-1.5 text-[11px] text-[#7A827A]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Otomatis ditutup bila kuota {offerTon.toFixed(1)} Ton habis terpesan.</span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#EFEAE0] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-[#6D756D]">
                Status: Listing Langsung Aktif
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                + Terbitkan Penawaran Sekarang
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpenSellOfferModal;