import { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Camera,
  Upload,
  ScanText,
  Lock,
  Copy,
  ShieldCheck,
  Send,
  Shield,
} from 'lucide-react';

export default function FarmerVerificationPage() {
  const [nik, setNik] = useState<string>('3321041405780002');
  const [fullName, setFullName] = useState<string>('SUGENG RIYADI');
  const [birthInfo, setBirthInfo] = useState<string>('Demak, 14 Mei 1978');
  const [ktpAddress, setKtpAddress] = useState<string>(
    'RT 03 / RW 02, Desa Karangawen, Kecamatan Karangawen, Kabupaten Demak, Jawa Tengah 59566'
  );
  const [agreed, setAgreed] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyNik = () => {
    navigator.clipboard.writeText(nik);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-1.5 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
            Verifikasi Status Kemitraan Petani
          </h1>
          <p className="text-xs sm:text-sm text-[#5C635E] leading-relaxed">
            Lengkapi verifikasi identitas dan dokumen kependudukan (e-KTP) untuk membuka kuota
            penjualan hasil panen tanpa batas, garansi timbangan resmi, dan pencairan instan.
          </p>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Section 1: Foto Dokumen e-KTP Asli */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1C241E]">Foto Dokumen e-KTP Asli</h2>
                    <p className="text-xs text-[#7A827C]">
                      Dokumen fisik e-KTP terbaru yang masih aktif dan sah.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] text-[11px] font-bold">
                  Wajib
                </span>
              </div>

              {/* KTP Preview Container */}
              <div className="rounded-2xl bg-[#F5F0E6] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Simulated KTP Card Visual */}
                <div className="sm:col-span-5 rounded-xl bg-gradient-to-br from-[#CBE5F6] via-[#E5F2FA] to-[#B7DCF4] border border-[#A5CDE8] p-3 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#8BB8D8] pb-1.5 mb-2">
                    <span className="text-[9px] font-extrabold tracking-wider text-[#1B3B5A]">
                      REPUBLIK INDONESIA
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#156E33]" />
                  </div>

                  <div className="space-y-1 text-[8px] text-[#1B3B5A] font-semibold">
                    <p className="font-bold">NIK : 3321041405780002</p>
                    <p>Nama : SUGENG RIYADI</p>
                    <p>Tempat/Tgl Lahir : DEMAK, 14-05-1978</p>
                    <p>Alamat : DESA KARANGAWEN RT 03/02</p>
                    <p>Pekerjaan : PETANI/PEKEBUN</p>
                  </div>

                  <div className="mt-3 rounded-md bg-[#3D352E] px-2.5 py-1.5 flex items-center justify-between text-[9px] font-mono text-white">
                    <span>3321 0414 **** 0002</span>
                    <span className="font-sans font-bold">SUGENG R.</span>
                  </div>
                </div>

                {/* OCR Status & Upload Controls */}
                <div className="sm:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E4F2E7] text-[#156E33] text-xs font-bold w-full">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Kualitas Foto Memenuhi Standar OCR
                  </div>

                  <p className="text-xs text-[#5C635E] leading-relaxed">
                    Format didukung: JPG, PNG, atau HEIC (Maksimal 5MB). Pastikan e-KTP tidak
                    terkena pantulan kilau lampu flash.
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EBE6DC] hover:bg-[#DFD9CD] text-xs font-bold text-[#1C241E] transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ambil Ulang
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E2DA] hover:bg-[#FAF8F4] text-xs font-bold text-[#1C241E] transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Ganti Berkas
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Data Kependudukan Hasil Pembacaan OCR */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0 mt-0.5">
                    <ScanText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1C241E]">
                      Data Kependudukan Hasil Pembacaan OCR
                    </h2>
                    <p className="text-xs text-[#7A827C]">
                      Silakan periksa dan perbaiki teks di bawah apabila terdapat ketidaksesuaian karakter.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] text-[11px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#156E33]" />
                  Terbaca Otomatis
                </span>
              </div>

              {/* NIK Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1C241E]">
                    Nomor Induk Kependudukan (NIK 16 Digit) <span className="text-red-500">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#156E33]">
                    <Lock className="w-3 h-3" />
                    Terenkripsi BSSN
                  </span>
                </div>
                <div className="flex items-center rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white overflow-hidden transition-colors">
                  <span className="px-3.5 py-3 bg-[#EBE6DC] text-xs font-bold text-[#5C635E]">
                    NIK
                  </span>
                  <input
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#1C241E] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyNik}
                    title="Salin NIK"
                    className="px-3.5 py-2.5 text-[#5C635E] hover:text-[#156E33] transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-[11px] text-[#156E33] font-medium">NIK berhasil disalin!</p>
                )}
              </div>

              {/* Nama Lengkap & TTL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Nama Lengkap Sesuai KTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-2.5 text-sm font-medium text-[#1C241E] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Tempat &amp; Tanggal Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={birthInfo}
                    onChange={(e) => setBirthInfo(e.target.value)}
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-2.5 text-sm font-medium text-[#1C241E] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Alamat Lengkap Sesuai KTP */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C241E]">
                  Alamat Lengkap Sesuai KTP <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={ktpAddress}
                  onChange={(e) => setKtpAddress(e.target.value)}
                  className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-3 text-sm font-medium text-[#1C241E] leading-relaxed outline-none resize-none transition-colors"
                />
              </div>
            </div>

            {/* Agreement Checkbox & Submit Button */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#156E33] cursor-pointer"
                />
                <span className="text-xs text-[#3D4740] leading-relaxed">
                  Saya menyatakan bahwa menyetujui pemrosesan data untuk keperluan verifikasi
                  kemitraan resmi agribisnis <strong className="text-[#156E33]">Tandur</strong>.
                </span>
              </label>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  disabled={!agreed}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#156E33] hover:bg-[#105728] disabled:opacity-50 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Kirim Dokumen Verifikasi Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* Right Security Info Card (4 cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#9A4D16]" />
                <h3 className="text-sm font-bold text-[#1C241E]">
                  Jaminan Privasi &amp; Enkripsi
                </h3>
              </div>

              <div className="rounded-xl bg-[#F5F2EB] p-3.5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white text-[#156E33] flex items-center justify-center shrink-0 shadow-2xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1C241E]">Enkripsi Berlapis AES-256</p>
                  <p className="text-[11px] text-[#7A827C] mt-0.5">
                    Standar Sertifikasi BSSN &amp; Kemkominfo
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#5C635E] leading-relaxed">
                Data e-KTP Anda dienkripsi secara aman dan hanya digunakan khusus untuk validasi
                keaslian mitra petani. Tandur menjamin tidak pernah membagikan data pribadi kepada
                pihak ketiga tanpa izin resmi.
              </p>

              <div className="pt-3 border-t border-[#F2EFE9] flex items-start gap-2 text-[11px] text-[#7A827C]">
                <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (PDP)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}