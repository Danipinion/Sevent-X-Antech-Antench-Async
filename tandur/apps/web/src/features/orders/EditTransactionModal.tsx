import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  X,
  Calendar,
  User,
  MapPin,
  Scale,
  Banknote,
  Clock,
  Truck,
  Loader2,
  Wheat,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { MiddlemanApi } from '@/services/api';

export interface TransactionPOItem {
  id: string;
  poNumber: string;
  isNew?: boolean;
  contractDate: string;
  scheduleInfo: string;
  scheduleType: 'upcoming' | 'completed';
  farmerInitials: string;
  farmerName: string;
  farmerGroup: string;
  locationNote: string;
  locationIcon: 'pin' | 'check';
  commodityName: string;
  weightText: string;
  weightKg: number;
  pricePerKg: number;
  totalValueText: string;
  pricePerKgText: string;
  status: 'Menuju Gudang Pembeli' | 'Diterima di Gudang' | 'Selesai & Diterima';
  fleetText: string;
  fieldNotes?: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionPOItem | null;
  onSave?: (updated: TransactionPOItem) => void | Promise<void>;
}

const LOCAL_ORDERS_KEY = 'tandur_local_po_orders';

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSave,
}) => {
  const [contractDate, setContractDate] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerGroup, setFarmerGroup] = useState('');
  const [location, setLocation] = useState('');
  const [commodity, setCommodity] = useState('');
  const [weightKg, setWeightKg] = useState<number>(500);
  const [pricePerKg, setPricePerKg] = useState<number>(0);
  const [scheduleTime, setScheduleTime] = useState('');
  const [fleet, setFleet] = useState('');
  const [status, setStatus] = useState<TransactionPOItem['status']>('Menuju Gudang Pembeli');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setContractDate(transaction.contractDate);
      setFarmerName(transaction.farmerName);
      setFarmerGroup(transaction.farmerGroup);
      setLocation(transaction.locationNote);
      setCommodity(transaction.commodityName);
      setWeightKg(transaction.weightKg);
      setPricePerKg(transaction.pricePerKg);
      setScheduleTime(
        transaction.scheduleInfo.replace(
          /^(Jadwal:\s*|Perkiraan Sampai:\s*|Selesai Bongkar:\s*)/i,
          ''
        )
      );
      setFleet(transaction.fleetText);
      setStatus(transaction.status);
      setNotes(
        transaction.fieldNotes ||
          'Timbang digital bersama di titik muat.'
      );
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const totalContract = weightKg * pricePerKg;
  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const getInitials = (name: string) => {
    const parts = (name || 'PT').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'PT';
  };

  const syncLocalStorage = (updatedItem: TransactionPOItem) => {
    try {
      const rawLocal = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      if (!Array.isArray(rawLocal)) return;

      const mappedStatus =
        updatedItem.status === 'Selesai & Diterima'
          ? 'completed'
          : updatedItem.status === 'Diterima di Gudang'
          ? 'in_transit'
          : 'scheduled';

      const updatedList = rawLocal.map((item: any) =>
        String(item.id) === String(updatedItem.id) ||
        String(item.po_number) === String(updatedItem.poNumber)
          ? {
              ...item,
              farmer_name: updatedItem.farmerName,
              farmer_group: updatedItem.farmerGroup,
              pickup_address: updatedItem.locationNote,
              commodity_name: updatedItem.commodityName,
              quantity: updatedItem.weightKg,
              weight_kg: updatedItem.weightKg,
              price_per_unit: updatedItem.pricePerKg,
              price_per_kg: updatedItem.pricePerKg,
              total_price: totalContract,
              pickup_date: scheduleTime,
              fleet_text: updatedItem.fleetText,
              notes: updatedItem.fieldNotes,
              status: mappedStatus,
            }
          : item
      );

      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedList));
    } catch {
      // Abaikan jika gagal parse localStorage
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const schedulePrefix =
      status === 'Menuju Gudang Pembeli' ? 'Jadwal: ' : 'Selesai Bongkar: ';

    const updatedItem: TransactionPOItem = {
      ...transaction,
      contractDate,
      farmerName,
      farmerGroup,
      farmerInitials: getInitials(farmerName),
      locationNote: location,
      locationIcon: status === 'Menuju Gudang Pembeli' ? 'pin' : 'check',
      commodityName: commodity,
      weightKg,
      weightText: `${(weightKg / 1000).toFixed(1)} Ton (${weightKg.toLocaleString('id-ID')} kg)`,
      pricePerKg,
      totalValueText: formatRupiah(totalContract),
      pricePerKgText: `${formatRupiah(pricePerKg)} / kg`,
      scheduleInfo: `${schedulePrefix}${scheduleTime}`,
      scheduleType: status === 'Menuju Gudang Pembeli' ? 'upcoming' : 'completed',
      status,
      fleetText: fleet,
      fieldNotes: notes,
    };

    try {
      // Sinkronkan perubahan ke penyimpanan lokal terlebih dahulu
      syncLocalStorage(updatedItem);

      if (onSave) {
        await onSave(updatedItem);
      } else {
        try {
          await MiddlemanApi.updatePurchaseOrder(transaction.id, {
            contract_date: contractDate,
            farmer_name: farmerName,
            farmer_group: farmerGroup,
            location_note: location,
            commodity_name: commodity,
            weight_kg: weightKg,
            price_per_kg: pricePerKg,
            total_price: totalContract,
            schedule_info: updatedItem.scheduleInfo,
            status,
            fleet_text: fleet,
            notes,
          });
        } catch {
          // Tetap lanjut karena perubahan sudah tersimpan di localStorage
        }

        await Swal.fire({
          icon: 'success',
          title: 'Transaksi PO Diperbarui',
          text: `Surat Pesanan #${transaction.poNumber} berhasil disimpan.`,
          timer: 1600,
          showConfirmButton: false,
        });
      }
      onClose();
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
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                Edit Transaksi &amp; Surat Pesanan (PO)
              </h2>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Perbarui informasi kontrak, jadwal timbang, tonase, dan status pesanan{' '}
                <span className="font-bold text-[#236B37]">#{transaction.poNumber}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor PO (Readonly) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Nomor PO
              </label>
              <input
                type="text"
                readOnly
                value={transaction.poNumber}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F3EFE6] border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none"
              />
            </div>

            {/* Tanggal Kontrak */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Tanggal Kontrak
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Nama Petani */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Nama Petani
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Kelompok Tani / Gapoktan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Kelompok Tani / Gapoktan
              </label>
              <input
                type="text"
                required
                value={farmerGroup}
                onChange={(e) => setFarmerGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            {/* Lokasi Muat / Lahan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Lokasi Muat / Lahan
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Komoditas & Varietas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Komoditas &amp; Varietas
              </label>
              <div className="relative">
                <Wheat className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="Nama komoditas & varietas"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Bobot Timbang / Tonase (kg) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Bobot Timbang / Tonase (kg)
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={1}
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                  {(weightKg / 1000).toFixed(1)} Ton
                </span>
              </div>
            </div>

            {/* Harga Tebas per Kg */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Harga Tebas per Kg
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={1}
                  required
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                  / kg
                </span>
              </div>
            </div>

            {/* Total Nilai Kontrak (Otomatis) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Total Nilai Kontrak (Otomatis)
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#F3EFE6] border border-[#E2DACB] flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#236B37]">
                  {formatRupiah(totalContract)}
                </span>
                <span className="text-[11px] text-[#7A827A]">
                  {weightKg.toLocaleString('id-ID')} kg × {formatRupiah(pricePerKg)}
                </span>
              </div>
            </div>

            {/* Status Pengiriman / Gudang */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Status Pesanan PO
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionPOItem['status'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37] cursor-pointer"
              >
                <option value="Menuju Gudang Pembeli">Menuju Gudang Pembeli</option>
                <option value="Diterima di Gudang">Diterima di Gudang</option>
                <option value="Selesai & Diterima">Selesai &amp; Diterima</option>
              </select>
            </div>

            {/* Waktu & Jadwal Timbang Sawah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Waktu &amp; Jadwal Timbang Sawah
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Jenis Armada & Nopol */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Jenis Armada &amp; Nopol
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fleet}
                  onChange={(e) => setFleet(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>
          </div>

          {/* Catatan Khusus Lapangan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#2D332D]">
              Catatan Khusus Lapangan (Opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37] resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#EFEAE0] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;