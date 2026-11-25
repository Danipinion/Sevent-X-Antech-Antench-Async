import React, { useState } from 'react';
import {
  CheckCircle2,
  IdCard,
  Check,
  Info,
  Lock,
  ShieldCheck,
  Phone,
  BellRing,
  Mail,
  FileText,
  MapPin,
  Truck,
} from 'lucide-react';

export default function FarmerProfilePage() {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('812-8990-1234');
  const [email, setEmail] = useState<string>('sugeng.santoso.tani@gmail.com');
  const [address, setAddress] = useState<string>(
    'Desa Karangawen, RT 03 / RW 02, Kec. Karangawen, Kab. Demak, Jawa Tengah\n(Patokan: Sebelah Barat Penggilingan Padi Berkah)'
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EFECE6]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
              Data Diri Petani
            </h1>
            <p className="text-xs sm:text-sm text-[#5C635E]">
              Kelola informasi identitas resmi dan kontak aktif Anda untuk kelancaran verifikasi
              timbang gabah serta transfer hasil panen.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start sm:self-center px-3.5 py-2 rounded-full bg-[#E8F5EC] text-[#156E33] text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 fill-[#156E33] text-white" />
            Dukcapil &amp; Distan Terhubung
          </div>
        </div>

        {/* Main Profile Form Card */}
        <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-8 shadow-2xs space-y-6">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1C241E]">
                  Informasi Identitas &amp; Kontak
                </h2>
                <p className="text-xs text-[#7A827C]">
                  Data ini digunakan sebagai dasar hukum akad jual beli gabah.
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#EFECE6] text-xs font-semibold text-[#5C635E]">
              ID: TNDR-DMK-2804
            </span>
          </div>

          {/* Row 1: Nama Lengkap & NIK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1C241E]">
                  Nama Lengkap (Sesuai KTP)
                </label>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#156E33]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terverifikasi
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F5F2EB] px-4 py-3 text-sm font-medium text-[#1C241E]">
                <span>Sugeng Santoso</span>
                <Check className="w-4 h-4 text-[#156E33]" />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-[#7A827C]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Tercatat resmi di database Dukcapil Kabupaten Demak.
              </p>
            </div>

            {/* NIK */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1C241E]">
                  Nomor Induk Kependudukan (NIK)
                </label>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7A827C]">
                  <Lock className="w-3 h-3" />
                  Terkunci
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F5F2EB] px-4 py-3 text-sm font-medium text-[#3D4740]">
                <span>3521092804750002</span>
                <Lock className="w-4 h-4 text-[#7A827C]" />
              </div>
              <p className="flex items-start gap-1.5 text-[11px] text-[#7A827C]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Terkunci demi perlindungan privasi rekening perbankan mitra.
              </p>
            </div>
          </div>

          {/* Row 2: Nomor WhatsApp & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nomor WhatsApp Utama */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1C241E]">
                Nomor WhatsApp Utama <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#EFECE6] px-3.5 py-3 text-sm font-bold text-[#156E33] shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                  +62
                </div>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-3 text-sm font-medium text-[#1C241E] outline-none transition-colors"
                />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#156E33]">
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                Terhubung langsung untuk notifikasi bukti timbang
              </p>
            </div>

            {/* Alamat Surel / Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1C241E]">
                  Alamat Surel / Email
                </label>
                <span className="text-[11px] text-[#7A827C]">Opsional</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white px-4 py-3 transition-colors">
                <Mail className="w-4 h-4 text-[#7A827C] shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[#1C241E] outline-none"
                />
              </div>
              <p className="flex items-start gap-1.5 text-[11px] text-[#7A827C]">
                <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Salinan faktur nota penjualan &amp; rekap bulanan akan dikirim ke alamat ini.
              </p>
            </div>
          </div>

          {/* Row 3: Alamat Domisili & Titik Kumpul */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1C241E]">
                Alamat Domisili &amp; Titik Kumpul Hasil Panen
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A4D16] hover:underline cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                Titik Jemput Armada
              </button>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white p-4 transition-colors">
              <MapPin className="w-4 h-4 text-[#7A827C] shrink-0 mt-1" />
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#1C241E] leading-relaxed outline-none resize-none"
              />
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-[#7A827C]">
              <Truck className="w-3.5 h-3.5 shrink-0" />
              Digunakan sopir truk Tandur saat menjemput gabah basah langsung dari tepi sawah.
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-[#F2EFE9] flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-[#EFECE6] hover:bg-[#E5E1D8] text-sm font-bold text-[#1C241E] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}