import React from 'react';
import {
  LayoutGrid,
  X,
  CheckCircle2,
  Warehouse,
  Gauge,
  Clock,
  Trash2,
  Pencil,
} from 'lucide-react';

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
  onDelete?: (id: string) => void;
  onEdit?: (item: InventoryItemDetail) => void;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onDelete,
  onEdit,
}) => {
  if (!isOpen || !item) return null;

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
                  Detail Komoditas Stok
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Komoditas Utama Highlight Card */}
          <div className="bg-[#F6F2EA] rounded-xl p-4 sm:p-5 border border-[#EDE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-[#7A827A]">
                KOMODITAS UTAMA
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-[#1A201A] mt-0.5">
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
                <span className="text-xl font-extrabold text-[#236B37]">
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
                <span className="text-lg font-extrabold text-[#1A201A]">
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
                  <span className="text-lg font-extrabold text-[#236B37]">
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
              <div className="text-xs text-[#6D756D]">Kualitas & Sensor Mutu</div>
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
            onClick={() => onDelete?.(item.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FCECEC] hover:bg-[#F9DADA] text-[#C93B3B] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Stok
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={() => onEdit?.(item)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] border border-[#E0D7C6] text-[#1A201A] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Data Stok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetailModal;