import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Loader2, Banknote, Scale, Calendar, MapPin, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

export interface FarmerListingItem {
  id: string;
  commodity_id?: string;
  commodity_name?: string;
  title?: string;
  description?: string;
  estimated_quantity?: number;
  unit?: string;
  price_per_unit?: number;
  ready_date?: string;
  pickup_address?: string;
  media_urls?: string[];
  status?: string;
  created_at?: string;
}

interface EditFarmerListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: FarmerListingItem | null;
  onSave: (listingId: string, payload: any) => Promise<void>;
}

export const EditFarmerListingModal: React.FC<EditFarmerListingModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [estimatedQuantity, setEstimatedQuantity] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [readyDate, setReadyDate] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(listing.title || listing.commodity_name || '');
      setEstimatedQuantity(listing.estimated_quantity || 0);
      setPricePerUnit(listing.price_per_unit || 0);
      setReadyDate(
        listing.ready_date
          ? listing.ready_date.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setPickupAddress(listing.pickup_address || '');
      setDescription(listing.description || '');
    }
  }, [listing, isOpen]);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estimatedQuantity <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Estimasi Bobot Tidak Valid',
        text: 'Estimasi bobot panen harus lebih dari 0 kg.',
        confirmButtonColor: '#156E33',
      });
      return;
    }
    if (pricePerUnit <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Harga Harapan Tidak Valid',
        text: 'Harga harapan per kg harus lebih dari Rp 0.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(listing.id, {
        title: title,
        commodity_name: listing.commodity_name || title,
        estimated_quantity: estimatedQuantity,
        price_per_unit: pricePerUnit,
        ready_date: readyDate ? `${readyDate}T07:00:00Z` : undefined,
        pickup_address: pickupAddress,
        description: description,
      });
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memperbarui Panen',
        text: err?.message || 'Terjadi kesalahan sistem saat memperbarui data panen.',
        confirmButtonColor: '#156E33',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const ton = (estimatedQuantity / 1000).toFixed(1);
  const totalEst = estimatedQuantity * pricePerUnit;

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
        <div className="px-6 py-5 border-b border-[#EFECE6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C241E]">
                Ubah Informasi Listing Panen
              </h2>
              <p className="text-xs text-[#5C635E]">
                {listing.commodity_name || 'Komoditas Panen'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A827C] hover:text-[#1C241E] hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Judul Panen */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <FileText className="w-3.5 h-3.5 text-[#156E33]" />
              Judul / Deskripsi Singkat Panen
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1C241E] focus:outline-none focus:border-[#156E33]"
            />
          </div>

          {/* Bobot dan Harga */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
                <Scale className="w-3.5 h-3.5 text-[#156E33]" />
                Estimasi Bobot (Kg)
              </label>
              <input
                type="number"
                step="1"
                min="100"
                required
                value={estimatedQuantity}
                onChange={(e) => setEstimatedQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1C241E] focus:outline-none focus:border-[#156E33]"
              />
              <span className="text-[11px] text-[#7A827C]">Setara: {ton} Ton</span>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
                <Banknote className="w-3.5 h-3.5 text-[#156E33]" />
                Harga Harapan / Kg
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A827C]">
                  Rp
                </span>
                <input
                  type="number"
                  step="1"
                  min="100"
                  required
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1C241E] focus:outline-none focus:border-[#156E33]"
                />
              </div>
              <span className="text-[11px] text-[#7A827C]">
                Total: Rp {(totalEst / 1_000_000).toFixed(2)} Jt
              </span>
            </div>
          </div>

          {/* Tanggal Siap Muat */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <Calendar className="w-3.5 h-3.5 text-[#156E33]" />
              Tanggal Siap Timbang &amp; Muat
            </label>
            <input
              type="date"
              required
              value={readyDate}
              onChange={(e) => setReadyDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1C241E] focus:outline-none focus:border-[#156E33]"
            />
          </div>

          {/* Lokasi Titik Jemput */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D332D]">
              <MapPin className="w-3.5 h-3.5 text-[#156E33]" />
              Titik Muat / Lokasi Gudang Tani
            </label>
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1C241E] focus:outline-none focus:border-[#156E33]"
            />
          </div>

          {/* Deskripsi Panen */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#2D332D]">
              Catatan Kualitas &amp; Kadar Air
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Gabah kering panen kadar air 22%, hasil panen sawah sendiri tanpa campuran."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1C241E] focus:outline-none focus:border-[#156E33]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-[#DFD8CA] text-xs font-semibold text-[#7A827C] hover:bg-[#F4EFE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
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
