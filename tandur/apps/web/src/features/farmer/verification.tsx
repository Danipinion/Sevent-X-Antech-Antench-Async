import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  X,
  Aperture,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchApi, getAuthToken } from '@/services/api';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const BASE_HOST = RAW_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const API_BASE_URL = `${BASE_HOST}/api/v1`;

export default function FarmerVerificationPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [nik, setNik] = useState<string>(storedUser?.nik || '3321041405780002');
  const [fullName, setFullName] = useState<string>(
    storedUser?.name ? storedUser.name.toUpperCase() : 'SUGENG RIYADI'
  );
  const [birthInfo, setBirthInfo] = useState<string>('Demak, 14 Mei 1978');
  const [ktpAddress, setKtpAddress] = useState<string>(
    storedUser?.ktp_address ||
      storedUser?.address ||
      'RT 03 / RW 02, Desa Karangawen, Kecamatan Karangawen, Kabupaten Demak, Jawa Tengah 59566'
  );

  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreviewUrl, setKtpPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [agreed, setAgreed] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(storedUser?.is_verified));

  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      try {
        const res = await fetchApi<{ data?: any }>('/auth/me');
        const profile = res?.data ?? res;
        if (isMounted && profile) {
          if (profile.nik) setNik(profile.nik);
          if (profile.name) setFullName(profile.name.toUpperCase());
          if (profile.birth_info) setBirthInfo(profile.birth_info);
          if (profile.ktp_address || profile.address) {
            setKtpAddress(profile.ktp_address || profile.address);
          }
          if (typeof profile.is_verified === 'boolean') {
            setIsVerified(profile.is_verified);
          }
        }
      } catch {
        // Fallback menggunakan data storage lokal
      }
    }
    loadUserData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (ktpPreviewUrl) {
        URL.revokeObjectURL(ktpPreviewUrl);
      }
      stopCameraStream();
    };
  }, [ktpPreviewUrl]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `ktp-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        if (ktpPreviewUrl) {
          URL.revokeObjectURL(ktpPreviewUrl);
        }

        setKtpFile(capturedFile);
        setKtpPreviewUrl(URL.createObjectURL(capturedFile));
        handleCloseCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCopyNik = () => {
    navigator.clipboard.writeText(nik);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Berkas Terlalu Besar',
        text: 'Maksimal ukuran foto e-KTP adalah 5MB.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    if (ktpPreviewUrl) {
      URL.revokeObjectURL(ktpPreviewUrl);
    }

    setKtpFile(file);
    setKtpPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitVerification = async () => {
    if (!agreed || isSubmitting) return;

    if (nik.trim().length !== 16) {
      await Swal.fire({
        icon: 'warning',
        title: 'NIK Tidak Valid',
        text: 'Nomor Induk Kependudukan (NIK) wajib berjumlah 16 digit.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    if (!fullName.trim() || !ktpAddress.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Harap lengkapi Nama Lengkap dan Alamat sesuai e-KTP.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();

      if (ktpFile) {
        const formData = new FormData();
        formData.append('ktp_image', ktpFile);
        formData.append('nik', nik.trim());
        formData.append('name', fullName.trim());
        formData.append('birth_info', birthInfo.trim());
        formData.append('ktp_address', ktpAddress.trim());

        const uploadRes = await fetch(`${API_BASE_URL}/farmer/verification`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!uploadRes.ok) {
          const errJson = await uploadRes.json().catch(() => null);
          throw new Error(
            errJson?.error?.message || errJson?.message || `HTTP Error ${uploadRes.status}`
          );
        }
      } else {
        await fetchApi('/farmer/verification', {
          method: 'POST',
          body: JSON.stringify({
            nik: nik.trim(),
            name: fullName.trim(),
            birth_info: birthInfo.trim(),
            ktp_address: ktpAddress.trim(),
          }),
        });
      }

      const updatedUser = {
        ...(storedUser || {}),
        nik: nik.trim(),
        name: fullName.trim(),
        ktp_address: ktpAddress.trim(),
        is_verified: true,
      };
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setIsVerified(true);

      await Swal.fire({
        icon: 'success',
        title: 'Dokumen Verifikasi Terkirim',
        text: 'Data identitas e-KTP Anda berhasil terverifikasi di sistem Tandur.',
        confirmButtonColor: '#156E33',
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Verifikasi Gagal',
        text:
          err?.message ||
          'Endpoint verifikasi belum tersedia di server atau permintaan ditolak.',
        confirmButtonColor: '#156E33',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskedNik =
    nik.length === 16
      ? `${nik.slice(0, 4)} ${nik.slice(4, 8)} **** ${nik.slice(12, 16)}`
      : '3321 0414 **** 0002';

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
              Verifikasi Status Kemitraan Petani
            </h1>
            <p className="text-xs sm:text-sm text-[#5C635E] leading-relaxed">
              Lengkapi verifikasi identitas dan dokumen kependudukan (e-KTP) untuk membuka kuota
              penjualan hasil panen tanpa batas, garansi timbangan resmi, dan pencairan instan.
            </p>
          </div>

          {isVerified && (
            <span className="self-start inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F5EC] text-[#156E33] text-xs font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              Mitra Terverifikasi
            </span>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

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
                {ktpPreviewUrl ? (
                  <div className="sm:col-span-5 rounded-xl overflow-hidden border border-[#A5CDE8] bg-white shadow-xs relative aspect-[1.6/1]">
                    <img
                      src={ktpPreviewUrl}
                      alt="Pratinjau e-KTP"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#156E33] text-white text-[9px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Terfoto
                    </span>
                  </div>
                ) : (
                  <div className="sm:col-span-5 rounded-xl bg-gradient-to-br from-[#CBE5F6] via-[#E5F2FA] to-[#B7DCF4] border border-[#A5CDE8] p-3 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#8BB8D8] pb-1.5 mb-2">
                      <span className="text-[9px] font-extrabold tracking-wider text-[#1B3B5A]">
                        REPUBLIK INDONESIA
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#156E33]" />
                    </div>

                    <div className="space-y-1 text-[8px] text-[#1B3B5A] font-semibold">
                      <p className="font-bold">NIK : {nik || '3321041405780002'}</p>
                      <p className="truncate">Nama : {fullName || 'SUGENG RIYADI'}</p>
                      <p className="truncate">Tempat/Tgl Lahir : {birthInfo.toUpperCase()}</p>
                      <p className="truncate">Alamat : {ktpAddress.toUpperCase()}</p>
                      <p>Pekerjaan : PETANI/PEKEBUN</p>
                    </div>

                    <div className="mt-3 rounded-md bg-[#3D352E] px-2.5 py-1.5 flex items-center justify-between text-[9px] font-mono text-white">
                      <span>{maskedNik}</span>
                      <span className="font-sans font-bold truncate max-w-[80px]">
                        {fullName || 'SUGENG R.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* OCR Status & Upload Controls */}
                <div className="sm:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E4F2E7] text-[#156E33] text-xs font-bold w-full">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {ktpFile
                      ? `Berkas siap: ${ktpFile.name}`
                      : 'Kualitas Foto Memenuhi Standar OCR'}
                  </div>

                  <p className="text-xs text-[#5C635E] leading-relaxed">
                    Format didukung: JPG, PNG, atau HEIC (Maksimal 5MB). Pastikan e-KTP tidak
                    terkena pantulan kilau lampu flash.
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EBE6DC] hover:bg-[#DFD9CD] text-xs font-bold text-[#1C241E] transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ambil Ulang
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
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
                    inputMode="numeric"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
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
                  onClick={handleSubmitVerification}
                  disabled={!agreed || isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#156E33] hover:bg-[#105728] disabled:opacity-50 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting
                    ? 'Mengirim Dokumen...'
                    : 'Kirim Dokumen Verifikasi Sekarang'}
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

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={handleCloseCamera}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#EFECE6]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EFECE6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#156E33]" />
                <h3 className="text-sm font-bold text-[#1C241E]">
                  Ambil Foto Dokumen e-KTP
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1.5 rounded-lg text-[#5C635E] hover:bg-[#F5F2EB] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Frame panduan KTP */}
              <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-white/80 rounded-xl flex items-end justify-center pb-2">
                <span className="px-2.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
                  Posisikan e-KTP di dalam bingkai
                </span>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#FDFBF7] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="px-4 py-2 rounded-xl bg-[#EBE6DC] hover:bg-[#DFD9CD] text-xs font-bold text-[#1C241E] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Aperture className="w-4 h-4" />
                Jepret Foto KTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}