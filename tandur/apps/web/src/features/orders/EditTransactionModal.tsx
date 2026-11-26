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
} from 'lucide-react';

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
  onSave?: (updated: TransactionPOItem) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSave,
}) => {
  const [contractDate, setContractDate] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [location, setLocation] = useState('');
  const [commodity, setCommodity] = useState('');
  const [weightKg, setWeightKg] = useState<number>(5000);
  const [pricePerKg, setPricePerKg] = useState<number>(6800);
  const [scheduleTime, setScheduleTime] = useState('');
  const [fleet, setFleet] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (transaction) {
      setContractDate(transaction.contractDate);
      setFarmerName(`${transaction.farmerName} (${transaction.farmerGroup})`);
      setLocation(transaction.locationNote);
      setCommodity(`${transaction.commodityName}`);
      setWeightKg(transaction.weightKg);
      setPricePerKg(transaction.pricePerKg);
      setScheduleTime('18 Mei 2025, 08:30 WIB');
      setFleet(transaction.fleetText);
      setNotes(
        transaction.fieldNotes ||
          'Timbangan sawah didampingi mandor lapangan Pak Joko. Toleransi refraksi kadar air standar 14%.'
      );
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const totalContract = weightKg * pricePerKg;
  const formatRupiah = (val: number) =>
    'Rp ' + val.toLocaleString('id-ID');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.({
      ...transaction,
      contractDate,
      locationNote: location,
      weightKg,
      pricePerKg,
      totalValueText: formatRupiah(totalContract),
      pricePerKgText: `${formatRupiah(pricePerKg)} / kg`,
      fleetText: fleet,
      fieldNotes: notes,
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
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                Edit Transaksi & Surat Pesanan (PO)
              </h2>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Perbarui informasi kontrak, jadwal timbang, tonase, dan status pesanan{' '}
                <span className="font-bold text-[#236B37]">#{transaction.poNumber}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor PO & Status (Readonly) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Nomor PO & Status
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
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Nama Petani / Gapoktan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Nama Petani / Gapoktan
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Komoditas & Varietas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Komoditas & Varietas
              </label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37] cursor-pointer"
              >
                <option value="GKP Ciherang">Gabah Kering Panen (GKP) - Ciherang</option>
                <option value="Beras Mentik Wangi">Beras Mentik Wangi</option>
                <option value="Gabah Kering Giling (GKG)">Gabah Kering Giling (GKG)</option>
                <option value="Jagung Pipil Kering">Jagung Pipil Kering</option>
              </select>
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

            {/* Waktu & Jadwal Timbang Sawah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Waktu & Jadwal Timbang Sawah
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>

            {/* Jenis Armada & Nopol */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#2D332D]">
                Jenis Armada & Nopol
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
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
              className="px-5 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;