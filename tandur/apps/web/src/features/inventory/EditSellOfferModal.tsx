import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Loader2, Banknote, Scale, Truck, Clock } from 'lucide-react';
import { SellOfferItem } from './SellStockPage';
import Swal from 'sweetalert2';

interface EditSellOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: SellOfferItem | null;
  onSave: (offerId: string, updatedData: any) => Promise<void>;
}

export const EditSellOfferModal: React.FC<EditSellOfferModalProps> = ({
  isOpen,
  onClose,
  offer,
  onSave,
}) => {
  const [offeredTons, setOfferedTons] = useState<number>(0);
  const [minOrderTons, setMinOrderTons] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [pickupMethod, setPickupMethod] = useState<string>('Jemput di Gudang (FOB Silo)');
  const [validity, setValidity] = useState<string>('3 Hari');
  const [status, setStatus] = useState<'active' | 'closed'>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (offer) {
      setOfferedTons(offer.offered_tons || 0);
      setMinOrderTons(offer.min_order_tons || 1);
      setSellingPrice(offer.selling_price_per_kg || 0);
      setPickupMethod(offer.pickup_method || 'Jemput di Gudang (FOB Silo)');
      setValidity(offer.validity || '3 Hari');
      setStatus(offer.status === 'closed' ? 'closed' : 'active');
    }
  }, [offer, isOpen]);

  if (!isOpen || !offer) return null;

  const costPrice = offer.cost_price_per_kg || 0;
  const marginPerKg = sellingPrice - costPrice;
  const totalMargin = marginPerKg * offeredTons * 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offeredTons <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Volume Tidak Valid',
        text: 'Volume penawaran harus lebih dari 0 Ton.',
        confirmButtonColor: '#236B37',
      });
      return;
    }
    if (sellingPrice <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Harga Jual Tidak Valid',
        text: 'Harga buka jual per kg harus lebih dari Rp 0.',
        confirmButtonColor: '#236B37',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(offer.id, {
        offered_tons: offeredTons,
        min_order_tons: minOrderTons,
        selling_price_per_kg: sellingPrice,
        delivery_option: pickupMethod,
        pickup_method: pickupMethod,
        validity: validity,
        status: status,
      });
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memperbarui Penawaran',
        text: err?.message || 'Terjadi kesalahan sistem saat memperbarui penawaran.',
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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#ECE6DA] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EFEAE0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                Kelola &amp; Ubah Penawaran Jual
              </h2>
              <p className="text-xs text-[#6D756D]">
                Lot #{offer.lot_code} • {offer.commodity_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Penawaran */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#EFEAE0] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#1A201A]">Status Listing Pasar</div>
              <div className="text-[11px] text-[#6D756D]">
                {status === 'active'
                  ? 'Tayang dan dapat dilihat oleh pembeli grosir & pabrik'
                  : 'Diarsipkan (disembunyikan dari pasar publik)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatus(status === 'active' ? 'closed' : 'active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                status === 'active'
                  ? 'bg-[#E1F3E5] text-[#236B37] border border-[#C2E8C9]'
                  : 'bg-[#F2EFE9] text-[#7A827C] border border-[#E0DCCE]'
              }`}
            >
              {status === 'active' ? '● Aktif Tayang' : '○ Diarsipkan'}
            </button>
          </div>

          {/* Volume Penawaran & Minimal Order */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
                <Scale className="w-3.5 h-3.5 text-[#236B37]" />
                Volume Dijual (Ton)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={offeredTons}
                onChange={(e) => setOfferedTons(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
                <Scale className="w-3.5 h-3.5 text-[#236B37]" />
                Minimal Order (Ton)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={minOrderTons}
                onChange={(e) => setMinOrderTons(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              />
            </div>
          </div>

          {/* Harga Penawaran */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <Banknote className="w-3.5 h-3.5 text-[#236B37]" />
              Harga Buka Jual per Kg
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
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseInt(e.target.value, 10) || 0)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              />
            </div>
            {costPrice > 0 && (
              <div className="flex items-center justify-between text-[11px] mt-1 text-[#6D756D]">
                <span>Modal Beli: Rp {costPrice.toLocaleString('id-ID')}/kg</span>
                <span className={marginPerKg >= 0 ? 'text-[#236B37] font-bold' : 'text-[#C93B2B] font-bold'}>
                  Margin: {marginPerKg >= 0 ? '+' : ''}Rp {marginPerKg.toLocaleString('id-ID')}/kg
                  {totalMargin > 0 && ` (Potensi Rp ${(totalMargin / 1_000_000).toFixed(1)} Jt)`}
                </span>
              </div>
            )}
          </div>

          {/* Opsi Pengiriman */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <Truck className="w-3.5 h-3.5 text-[#236B37]" />
              Opsi Logistik &amp; Pengambilan
            </label>
            <select
              value={pickupMethod}
              onChange={(e) => setPickupMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
            >
              <option value="Jemput di Gudang (FOB Silo)">
                Jemput Sendiri di Gudang (FOB Silo)
              </option>
              <option value="Kirim Armada CDD Tengkulak">
                Kirim Armada CDD Tengkulak (Ongkir terpisah)
              </option>
              <option value="Logistik Mitra Tandur">
                Logistik Terpadu Tandur
              </option>
            </select>
          </div>

          {/* Masa Berlaku */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <Clock className="w-3.5 h-3.5 text-[#236B37]" />
              Masa Berlaku Penawaran
            </label>
            <select
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
            >
              <option value="1 Hari">1 Hari (Kilat)</option>
              <option value="3 Hari">3 Hari (Rekomendasi Pasar Aktif)</option>
              <option value="7 Hari">7 Hari (1 Pekan)</option>
              <option value="14 Hari">14 Hari</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFEAE0]">
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
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
