import React, { useState, useEffect } from 'react';
import {
  PlusSquare,
  X,
  LayoutGrid,
  Scale,
  Banknote,
  Save,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { MiddlemanApi, fetchApi } from '@/services/api';

export interface IncomingStockPayload {
  commodity: string;
  supplier?: string;
  batchCode: string;
  receivedTime: string;
  siloLocation?: string;
  tonnage: number;
  yieldPercent: number;
  buyPrice: number;
  marketRefPrice: number;
}

interface AddIncomingStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: IncomingStockPayload) => void | Promise<void>;
}

interface SP2KPOption {
  id: string;
  name: string;
  price: number;
}

const DEFAULT_SP2KP_OPTIONS: SP2KPOption[] = [
  { id: '52', name: 'Beras Medium', price: 14025 },
  { id: '51', name: 'Beras Premium', price: 15710 },
  { id: '1', name: 'Beras SPHP Bulog', price: 12371 },
  { id: '14', name: 'Gula Pasir Curah', price: 18673 },
  { id: '48', name: 'Kedelai Impor', price: 13846 },
  { id: '2', name: 'Cabai Merah Keriting', price: 66713 },
  { id: '10', name: 'Cabai Rawit Merah', price: 71862 },
  { id: '13', name: 'Bawang Merah', price: 34899 },
  { id: '38', name: 'Bawang Putih Honan', price: 34112 },
  { id: 'jagung', name: 'Jagung Pipil Kering', price: 5600 },
];

export const AddIncomingStockModal: React.FC<AddIncomingStockModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [commodityOptions, setCommodityOptions] = useState<SP2KPOption[]>(DEFAULT_SP2KP_OPTIONS);
  const [commodity, setCommodity] = useState('Beras Medium');
  const [batchCode, setBatchCode] = useState(() => `#BATCH-TNDR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [receivedTime, setReceivedTime] = useState(() => {
    const now = new Date();
    return (
      now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ', ' +
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB'
    );
  });
  const [tonnage, setTonnage] = useState<number>(8.5);
  const [yieldPercent, setYieldPercent] = useState<number>(66.5);
  const [buyPrice, setBuyPrice] = useState<number>(14025);
  const [marketRefPrice, setMarketRefPrice] = useState<number>(14025);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    async function loadSp2kp() {
      try {
        const res = await fetchApi<any>('/commodities');
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const mapped: SP2KPOption[] = list.map((c: any) => ({
            id: String(c.id || c.commodity_id || c.name),
            name: c.name || c.commodity_name,
            price: Number(c.current_market_price ?? c.average_price ?? c.base_price ?? 0),
          }));
          setCommodityOptions(mapped);
          if (mapped[0]) {
            setCommodity(mapped[0].name);
            setBuyPrice(mapped[0].price);
            setMarketRefPrice(mapped[0].price);
          }
        }
      } catch {
        // Abaikan, gunakan fallback SP2KP
      }
    }
    if (isOpen) {
      loadSp2kp();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalKg = Math.round(tonnage * 1000);
  const totalBuyCost = totalKg * buyPrice;
  const marginPerKg = marketRefPrice - buyPrice;
  const marginPercent = buyPrice > 0 ? ((marginPerKg / buyPrice) * 100).toFixed(2) : '0.00';
  const netMarginTotal = totalKg * marginPerKg;

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleCommodityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCommodity(val);
    const found = commodityOptions.find((c) => c.name === val);
    if (found && found.price > 0) {
      setBuyPrice(found.price);
      setMarketRefPrice(found.price);
    }
  };

  const inferCategory = (name: string): 'Gabah' | 'Beras' | 'Palawija' => {
    const lower = name.toLowerCase();
    if (lower.includes('beras')) return 'Beras';
    if (lower.includes('jagung') || lower.includes('kedelai')) return 'Palawija';
    return 'Gabah';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const formData: IncomingStockPayload = {
      commodity,
      supplier: 'Mitra Petani Tandur',
      batchCode,
      receivedTime,
      siloLocation: 'Gudang Utama',
      tonnage,
      yieldPercent,
      buyPrice,
      marketRefPrice,
    };

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      } else {
        const cleanLocation = 'Gudang Utama';
        await MiddlemanApi.addIncomingStock({
          batch_code: batchCode,
          commodity_name: commodity,
          variety: 'Standar SP2KP',
          category: inferCategory(commodity),
          supplier_name: 'Mitra Petani Tandur',
          warehouse_name: cleanLocation,
          location: cleanLocation,
          stock_kg: totalKg,
          weight_kg: totalKg,
          weight_tons: tonnage,
          avg_buy_price: buyPrice,
          buy_price_per_kg: buyPrice,
          market_ref_price: marketRefPrice,
          market_price_per_kg: marketRefPrice,
          yield_percent: yieldPercent,
          moisture_content: yieldPercent,
          entry_date: new Date().toISOString(),
          received_at: receivedTime,
        });

        await Swal.fire({
          icon: 'success',
          title: 'Stok Gudang Ditambahkan',
          text: `${tonnage} Ton (${totalKg.toLocaleString('id-ID')} kg) ${commodity} berhasil dicatat ke stok gudang mengacu pada SP2KP.`,
          timer: 1800,
          showConfirmButton: false,
        });
      }
      onClose();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Stok',
        text: err?.message || 'Terjadi kesalahan saat mengirim data stok ke server.',
        confirmButtonColor: '#236B37',
      });
    } finally {
      setIsSaving(false);
    }
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
                  Acuan SP2KP
                </span>
              </div>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Catat komoditas panen yang baru tiba dari penimbangan mitra petani berbasis acuan harga SP2KP Kemendag RI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Section 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#236B37]">
              <LayoutGrid className="w-3.5 h-3.5" />
              1. KOMODITAS &amp; BATCH PENERIMAAN (ACUAN SP2KP)
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Jenis Komoditas (SP2KP)
                </label>
                <select
                  value={commodity}
                  onChange={handleCommodityChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                >
                  {commodityOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name} ({formatRupiah(opt.price)}/kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#2D332D]">
                    Nomor Lot / Kode Batch Timbang
                  </label>
                  <input
                    type="text"
                    required
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-mono font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#2D332D]">
                    Waktu Penerimaan &amp; Masuk Gudang
                  </label>
                  <input
                    type="text"
                    required
                    value={receivedTime}
                    onChange={(e) => setReceivedTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F2EA] border border-[#E5DEC9] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#236B37]">
              <Scale className="w-3.5 h-3.5" />
              2. STOK FISIK, BOBOT TIMBANG &amp; UJI KADAR AIR
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Total Berat Timbang Bersih (Ton)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={tonnage}
                    onChange={(e) => setTonnage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6D756D]">
                    Ton ({totalKg.toLocaleString('id-ID')} Kg)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Estimasi Rendemen Beras / Hasil Jadi (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={yieldPercent}
                    onChange={(e) => setYieldPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6D756D]">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#236B37]">
              <Banknote className="w-3.5 h-3.5" />
              3. HARGA BELI / TEBAS PETANI &amp; ACUAN SP2KP
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Harga Tebas / Beli per Kg
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6D756D]">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="100"
                    required
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(parseInt(e.target.value, 10) || 0)}
                    placeholder="Contoh: 14025"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                  />
                </div>
                <p className="text-[11px] text-[#7A827A]">
                  Harga riil yang disepakati bersama petani saat penimbangan
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Acuan Pasar SP2KP (Kemendag RI)
                </label>
                <div className="p-2.5 rounded-xl bg-[#F6F2EA] border border-[#E2DACB] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-[#6D756D]">Harga Resmi Bapanas/SP2KP</div>
                    <div className="text-sm font-bold text-[#236B37]">{formatRupiah(marketRefPrice)} <span className="text-xs font-normal text-[#6D756D]">/kg</span></div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[10px] font-bold">
                    Tersinkron
                  </span>
                </div>
                <p className="text-[11px] text-[#7A827A]">
                  Acuan pasar resmi wilayah Jawa Timur (otomatis diperbarui)
                </p>
              </div>
            </div>

            {/* Kalkulasi Ringkas */}
            <div className="p-3.5 rounded-xl bg-[#F6F2EA] border border-[#E6DFD2] space-y-2 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6D756D]">Total Modal Pembelian:</span>
                <span className="font-bold text-[#1A201A]">{formatRupiah(totalBuyCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6D756D]">Margin terhadap Acuan SP2KP:</span>
                <span className={`font-bold ${marginPerKg >= 0 ? 'text-[#236B37]' : 'text-[#C93B2B]'}`}>
                  {marginPerKg >= 0 ? '+' : ''}{formatRupiah(marginPerKg)}/Kg ({marginPercent}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-[#ECE5D8]">
                <span className="font-semibold text-[#2D332D]">Proyeksi Margin Kotor Total:</span>
                <span className={`font-bold ${netMarginTotal >= 0 ? 'text-[#236B37]' : 'text-[#C93B2B]'}`}>
                  {netMarginTotal >= 0 ? '+' : ''}{formatRupiah(netMarginTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFEAE0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-[#DFD8CA] text-xs font-semibold text-[#6D756D] hover:bg-[#F4EFE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Stok Masuk
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncomingStockModal;
