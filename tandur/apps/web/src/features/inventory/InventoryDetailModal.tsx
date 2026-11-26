import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  X,
  CheckCircle2,
  Warehouse,
  Gauge,
  Clock,
  Trash2,
  Pencil,
  Save,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { MiddlemanApi } from '@/services/api';

export interface InventoryItemDetail {
  id: string;
  batchId: string;
  name: string;
  variety: string;
  category: 'Gabah' | 'Beras' | 'Palawija';
  status: 'Aman' | 'Menipis' | 'Kritis';
  statusBadgeText: string;
  processingStatus: string;
  totalStockTon: string;
  totalStockKg: string;
  progressPercent: number;
  location: string;
  occupancyText: string;
  avgBuyPrice: string;
  buyPriceNote: string;
  marketRefPrice: string;
  marginBadge: string;
  marketUpdateNote: string;
  moistureQuality: string;
  calibrationNote: string;
  lastIncomingTime: string;
  lastIncomingSource: string;
}

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemDetail | null;
  onDelete?: (id: string) => void | Promise<void>;
  onEdit?: (item: InventoryItemDetail) => void | Promise<void>;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editVariety, setEditVariety] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState<'Aman' | 'Menipis' | 'Kritis'>('Aman');
  const [editProcessingStatus, setEditProcessingStatus] = useState('');
  const [editStockKg, setEditStockKg] = useState<number>(0);
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editMarketPrice, setEditMarketPrice] = useState<number>(0);
  const [editMoisture, setEditMoisture] = useState('');

  const parseNumeric = (text: string): number => {
    const digits = text.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  useEffect(() => {
    if (item) {
      setIsEditing(false);
      setEditName(item.name);
      setEditVariety(item.variety);
      setEditLocation(item.location);
      setEditStatus(item.status);
      setEditProcessingStatus(item.processingStatus);
      setEditStockKg(parseNumeric(item.totalStockKg));
      setEditBuyPrice(parseNumeric(item.avgBuyPrice));
      setEditMarketPrice(parseNumeric(item.marketRefPrice));
      setEditMoisture(item.moistureQuality);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleDeleteClick = async () => {
    if (isSubmitting) return;

    if (onDelete) {
      await onDelete(item.id);
      return;
    }

    const confirmResult = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Stok Komoditas?',
      text: `Stok ${item.name} (${item.batchId}) akan dihapus permanen dari inventaris gudang.`,
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#C93B3B',
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    try {
      await MiddlemanApi.deleteInventory(item.id);
      await Swal.fire({
        icon: 'success',
        title: 'Stok Dihapus',
        text: `${item.name} telah dihapus dari gudang.`,
        timer: 1500,
        showConfirmButton: false,
      });
      onClose();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus Stok',
        text: err?.message || 'Terjadi kesalahan saat menghapus data stok dari server.',
        confirmButtonColor: '#236B37',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const marginPerKg = editMarketPrice - editBuyPrice;
    const marginPercent =
      editBuyPrice > 0 ? ((marginPerKg / editBuyPrice) * 100).toFixed(1) : '0.0';
    const tonValue = (editStockKg / 1000).toFixed(1);

    const updatedItem: InventoryItemDetail = {
      ...item,
      name: editName,
      variety: editVariety,
      location: editLocation,
      status: editStatus,
      statusBadgeText:
        editStatus === 'Aman'
          ? 'Stok Aman • Tera Aktif'
          : editStatus === 'Menipis'
          ? 'Stok Menipis'
          : 'Stok Kritis',
      processingStatus: editProcessingStatus,
      totalStockTon: `${tonValue} Ton`,
      totalStockKg: `${editStockKg.toLocaleString('id-ID')} kg`,
      avgBuyPrice: formatRupiah(editBuyPrice),
      marketRefPrice: formatRupiah(editMarketPrice),
      marginBadge: `${marginPerKg >= 0 ? '+' : ''}${marginPercent}%`,
      moistureQuality: editMoisture,
    };

    setIsSubmitting(true);
    try {
      await MiddlemanApi.updateInventory(item.id, {
        commodity_name: editName,
        variety: editVariety,
        location: editLocation,
        status: editStatus,
        processing_status: editProcessingStatus,
        stock_kg: editStockKg,
        avg_buy_price: editBuyPrice,
        market_ref_price: editMarketPrice,
        moisture_quality: editMoisture,
      });

      if (onEdit) {
        await onEdit(updatedItem);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Data Stok Diperbarui',
        text: `Informasi lot ${item.batchId} berhasil disimpan ke database.`,
        timer: 1500,
        showConfirmButton: false,
      });

      setIsEditing(false);
      onClose();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Memperbarui Stok',
        text: err?.message || 'Terjadi kesalahan saat menyimpan perubahan stok.',
        confirmButtonColor: '#236B37',
      });
    } finally {
      setIsSubmitting(false);
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
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#EFEAE0] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0 mt-0.5">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  {isEditing ? 'Edit Data Komoditas Stok' : 'Detail Komoditas Stok'}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                  {item.statusBadgeText}
                </span>
              </div>
              <p className="text-xs font-mono text-[#7A827A] mt-0.5">
                ID Lot: {item.batchId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Edit vs Mode Detail */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Nama Komoditas
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Varietas / Pemasok
                </label>
                <input
                  type="text"
                  required
                  value={editVariety}
                  onChange={(e) => setEditVariety(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Lokasi Penyimpanan
                </label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Status Stok
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'Aman' | 'Menipis' | 'Kritis')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                >
                  <option value="Aman">Aman</option>
                  <option value="Menipis">Menipis</option>
                  <option value="Kritis">Kritis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Total Stok Fisik (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editStockKg}
                  onChange={(e) => setEditStockKg(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Status Pengolahan
                </label>
                <input
                  type="text"
                  required
                  value={editProcessingStatus}
                  onChange={(e) => setEditProcessingStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Harga Tebas Rata-rata (Rp / kg)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editBuyPrice}
                  onChange={(e) => setEditBuyPrice(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Acuan Jual Pasar (Rp / kg)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editMarketPrice}
                  onChange={(e) => setEditMarketPrice(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-[#2D332D]">
                  Kualitas &amp; Sensor Mutu
                </label>
                <input
                  type="text"
                  required
                  value={editMoisture}
                  onChange={(e) => setEditMoisture(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EFEAE0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal Edit
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Komoditas Utama Highlight Card */}
              <div className="bg-[#F6F2EA] rounded-xl p-4 sm:p-5 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-[#7A827A]">
                    KOMODITAS UTAMA
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-[#1A201A] mt-0.5">
                    {item.name}
                  </div>
                  <div className="text-xs text-[#6D756D] mt-0.5">{item.variety}</div>
                </div>

                <div className="sm:text-right">
                  <div className="text-[11px] text-[#6D756D] mb-1">Status Pengolahan</div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#236B37] text-white text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.processingStatus}
                  </span>
                </div>
              </div>

              {/* 2x2 Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Total Stok Fisik */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Total Stok Fisik</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#236B37]">
                      {item.totalStockTon}
                    </span>
                    <span className="text-xs text-[#7A827A]">({item.totalStockKg})</span>
                  </div>
                  <div className="mt-3 w-full h-1.5 bg-[#E4DDD0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#236B37] rounded-full transition-all"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Lokasi Penyimpanan */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Lokasi Penyimpanan</div>
                  <div className="mt-1 flex items-center gap-2 font-bold text-sm sm:text-base text-[#1A201A]">
                    <Warehouse className="w-4 h-4 text-[#236B37] shrink-0" />
                    <span>{item.location}</span>
                  </div>
                  <div className="mt-2.5 text-xs text-[#6D756D]">{item.occupancyText}</div>
                </div>

                {/* Harga Tebas Rata-rata */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Harga Tebas Rata-rata</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-[#1A201A]">
                      {item.avgBuyPrice}
                    </span>
                    <span className="text-xs text-[#7A827A]">/ kg</span>
                  </div>
                  <div className="mt-2 text-xs text-[#7A827A]">{item.buyPriceNote}</div>
                </div>

                {/* Acuan Jual Pasar Demak */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Acuan Jual Pasar Demak</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#236B37]">
                        {item.marketRefPrice}
                      </span>
                      <span className="text-xs text-[#7A827A]">/ kg</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                      {item.marginBadge}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#7A827A]">{item.marketUpdateNote}</div>
                </div>

                {/* Kualitas & Sensor Mutu */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Kualitas &amp; Sensor Mutu</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#1A201A]">
                    <Gauge className="w-4 h-4 text-[#236B37] shrink-0" />
                    <span>{item.moistureQuality}</span>
                  </div>
                  <div className="mt-2 text-xs text-[#7A827A]">{item.calibrationNote}</div>
                </div>

                {/* Terakhir Masuk */}
                <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex flex-col justify-between">
                  <div className="text-xs text-[#6D756D]">Terakhir Masuk</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#1A201A]">
                    <Clock className="w-4 h-4 text-[#6D756D] shrink-0" />
                    <span>{item.lastIncomingTime}</span>
                  </div>
                  <div className="mt-2 text-xs text-[#7A827A]">{item.lastIncomingSource}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-[#FAF8F3] border-t border-[#EFEAE0] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FCECEC] hover:bg-[#F9DADA] text-[#C93B3B] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Hapus Stok
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] border border-[#E0D7C6] text-[#1A201A] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Data Stok
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryDetailModal;