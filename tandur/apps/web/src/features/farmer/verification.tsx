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
  Info,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchApi, getAuthToken } from '@/services/api';
import { parseKtpText, type KtpOcrResult } from '@/utils/ktpOcrParser';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const BASE_HOST = RAW_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const API_BASE_URL = `${BASE_HOST}/api/v1`;

type OcrStatus = 'idle' | 'scanning' | 'success' | 'partial' | 'error';

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

  // 1. Data form kependudukan (HARUS KOSONG diawal sesuai instruksi pengguna)
  const [nik, setNik] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [birthInfo, setBirthInfo] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [ktpAddress, setKtpAddress] = useState<string>('');

  // 2. Berkas & status OCR
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreviewUrl, setKtpPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrMessage, setOcrMessage] = useState<string>('');

  // 3. Status verifikasi & formulir
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [agreed, setAgreed] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(storedUser?.is_verified));

  // Ambil profil user jika sudah pernah terverifikasi sebelumnya
  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      try {
        const res = await fetchApi<{ data?: any }>('/auth/me');
        const profile = res?.data ?? res;
        if (isMounted && profile) {
          if (typeof profile.is_verified === 'boolean') {
            setIsVerified(profile.is_verified);
          }
          // Jika akun memang sudah terverifikasi sebelumnya, tampilkan data yang sudah ada
          if (profile.is_verified) {
            if (profile.nik) setNik(profile.nik);
            if (profile.name) setFullName(profile.name.toUpperCase());
            if (profile.birth_info) setBirthInfo(profile.birth_info);
            if (profile.ktp_address || profile.address) {
              setKtpAddress(profile.ktp_address || profile.address);
            }
          }
        }
      } catch {
        // Fallback jika offline
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

  // Fungsi pemindaian teks KTP menggunakan OCR Tesseract
  const runOcrOnKtpImage = async (file: File) => {
    setOcrStatus('scanning');
    setOcrProgress(10);
    setOcrMessage('Mempersiapkan modul pemindai OCR e-KTP...');

    try {
      const { createWorker } = await import('tesseract.js');

      let text = '';
      let workerInstance: any = null;

      try {
        // 1. Coba inisialisasi worker lokal agar instan dan offline-ready
        setOcrProgress(25);
        setOcrMessage('Memuat mesin pembaca dokumen lokal...');
        workerInstance = await createWorker('ind', 1, {
          workerPath: '/tesseract/worker.min.js',
          corePath: '/tesseract/tesseract-core.wasm.js',
          langPath: '/tesseract',
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.min(95, Math.max(30, Math.round(m.progress * 100)));
              setOcrProgress(pct);
              setOcrMessage(`Mengekstrak karakter dokumen e-KTP: ${pct}%`);
            }
          },
        });
        const res = await workerInstance.recognize(file);
        text = res?.data?.text || '';
        await workerInstance.terminate();
      } catch (localErr) {
        console.warn('Gagal memuat worker lokal, beralih ke engine fallback:', localErr);
        // 2. Fallback ke worker standar Tesseract
        setOcrProgress(40);
        setOcrMessage('Mengekstrak teks dengan engine OCR fallback...');
        const fallbackWorker = await createWorker('ind', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.min(95, Math.max(40, Math.round(m.progress * 100)));
              setOcrProgress(pct);
              setOcrMessage(`Mengekstrak karakter e-KTP: ${pct}%`);
            }
          },
        });
        const res = await fallbackWorker.recognize(file);
        text = res?.data?.text || '';
        await fallbackWorker.terminate();
      }

      setOcrProgress(100);

      // 3. Parsing hasil teks OCR e-KTP Indonesia
      const parsed: KtpOcrResult = parseKtpText(text);

      if (parsed.nik) setNik(parsed.nik);
      if (parsed.name) setFullName(parsed.name);
      if (parsed.birthInfo) {
        setBirthInfo(parsed.birthInfo);
        setBirthPlace(parsed.birthPlace);
        setBirthDate(parsed.birthDate);
      }
      if (parsed.address) setKtpAddress(parsed.address);

      // Evaluasi apakah seluruh field utama berhasil terbaca
      const hasNik = Boolean(parsed.nik && parsed.nik.length === 16);
      const hasName = Boolean(parsed.name && parsed.name.length >= 2);
      const hasBirth = Boolean(parsed.birthInfo);
      const hasAddress = Boolean(parsed.address);

      if (hasNik && hasName && hasBirth && hasAddress) {
        setOcrStatus('success');
        setOcrMessage('Semua data kependudukan berhasil diekstraksi secara otomatis!');
        Swal.fire({
          icon: 'success',
          title: 'OCR Berhasil!',
          text: 'Seluruh data e-KTP berhasil dibaca dan dimasukkan ke dalam form.',
          timer: 2000,
          showConfirmButton: false,
        });
      } else if (hasNik || hasName || hasBirth || hasAddress) {
        setOcrStatus('partial');
        setOcrMessage(
          'Sebagian data e-KTP berhasil terbaca otomatis. Silakan lengkapi atau perbaiki field yang masih kosong.'
        );
        Swal.fire({
          icon: 'info',
          title: 'OCR Terbaca Sebagian',
          text: 'Sebagian data berhasil diekstraksi. Mohon periksa dan lengkapi sisa kolom yang masih kosong sebelum mengirim verifikasi.',
          confirmButtonColor: '#156E33',
        });
      } else {
        setOcrStatus('partial');
        setOcrMessage(
          'Foto terbaca namun teks kurang jelas. Silakan isi form di bawah sesuai dokumen fisik asli Anda.'
        );
      }
    } catch (err: any) {
      console.error('Error saat proses OCR:', err);
      setOcrStatus('error');
      setOcrMessage('Gagal memproses pemindaian otomatis. Anda dapat mengisi kolom data secara manual.');
      Swal.fire({
        icon: 'warning',
        title: 'Pemindaian Terkendala',
        text: 'Sistem tidak dapat membaca gambar dengan jelas. Anda tetap dapat memasukkan data secara manual.',
        confirmButtonColor: '#156E33',
      });
    }
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

        // Jalankan OCR segera setelah foto dijepret
        runOcrOnKtpImage(capturedFile);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCopyNik = () => {
    if (!nik) return;
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

    // Jalankan OCR segera setelah berkas dipilih
    runOcrOnKtpImage(file);
  };

  // Evaluasi kelengkapan form: hanya jika semua field terisi DAN dokumen ada
  const isFormComplete =
    Boolean(ktpFile || ktpPreviewUrl) &&
    nik.trim().length === 16 &&
    fullName.trim().length >= 2 &&
    birthInfo.trim().length >= 3 &&
    ktpAddress.trim().length >= 5;

  const canSubmit = isFormComplete && agreed && !isSubmitting && ocrStatus !== 'scanning';

  const handleSubmitVerification = async () => {
    if (!canSubmit) {
      if (!ktpFile && !ktpPreviewUrl) {
        await Swal.fire({
          icon: 'warning',
          title: 'Unggah Foto e-KTP',
          text: 'Harap unggah atau jepret foto dokumen e-KTP asli terlebih dahulu untuk dipindai OCR.',
          confirmButtonColor: '#156E33',
        });
        return;
      }

      if (nik.trim().length !== 16) {
        await Swal.fire({
          icon: 'warning',
          title: 'NIK Tidak Valid',
          text: 'Nomor Induk Kependudukan (NIK) wajib 16 digit angka.',
          confirmButtonColor: '#156E33',
        });
        return;
      }

      if (!fullName.trim() || !birthInfo.trim() || !ktpAddress.trim()) {
        await Swal.fire({
          icon: 'warning',
          title: 'Data Form Belum Lengkap',
          text: 'Seluruh data kependudukan (Nama, Tempat/Tanggal Lahir, Alamat) wajib terisi sebelum verifikasi dapat dikirim.',
          confirmButtonColor: '#156E33',
        });
        return;
      }

      if (!agreed) {
        await Swal.fire({
          icon: 'warning',
          title: 'Pernyataan Persetujuan',
          text: 'Centang kotak persetujuan pemrosesan data verifikasi kemitraan resmi Tandur.',
          confirmButtonColor: '#156E33',
        });
        return;
      }

      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();

      // Ekstraksi tempat dan tanggal lahir jika belum terpisah
      let derivedPlace = birthPlace;
      let derivedDate = birthDate;
      if (!derivedPlace || !derivedDate) {
        const parts = birthInfo.split(/[,/]/);
        derivedPlace = parts[0]?.trim() || 'Demak';
        derivedDate = parts.slice(1).join(',').trim() || '1980-01-01';
      }

      if (ktpFile) {
        const formData = new FormData();
        // Backend Go Fiber memeriksa form file "ktp_photo"
        formData.append('ktp_photo', ktpFile);
        formData.append('nik', nik.trim());
        formData.append('name', fullName.trim());
        formData.append('birth_place', derivedPlace);
        formData.append('birth_date', derivedDate);
        formData.append('ktp_address', ktpAddress.trim());
        formData.append('declaration_accepted', 'true');

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
            birth_place: derivedPlace,
            birth_date: derivedDate,
            ktp_address: ktpAddress.trim(),
            declaration_accepted: true,
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
        title: 'e-KTP Berhasil Terverifikasi!',
        text: 'Dokumen dan seluruh data kependudukan Anda telah diverifikasi oleh sistem Tandur.',
        confirmButtonColor: '#156E33',
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Verifikasi Belum Dapat Diproses',
        text:
          err?.message ||
          'Terjadi kendala saat mengirim dokumen verifikasi ke server.',
        confirmButtonColor: '#156E33',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <span className="self-start inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F5EC] text-[#156E33] text-xs font-bold shrink-0 shadow-2xs">
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
                      Unggah foto fisik e-KTP untuk dipindai secara otomatis oleh sistem OCR.
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

                    {/* Overlay status pemindaian OCR */}
                    {ocrStatus === 'scanning' ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center text-white space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                        <span className="text-xs font-bold">Memindai OCR ({ocrProgress}%)</span>
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden max-w-[140px]">
                          <div
                            className="bg-green-400 h-full transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#156E33] text-white text-[9px] font-bold shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Terfoto
                      </span>
                    )}
                  </div>
                ) : (
                  /* Placeholder e-KTP ketika belum ada foto */
                  <div className="sm:col-span-5 rounded-xl bg-gradient-to-br from-[#E8F0F7] via-[#F0F5FA] to-[#DDE9F2] border-2 border-dashed border-[#A5CDE8] p-4 flex flex-col items-center justify-center text-center aspect-[1.6/1] space-y-2">
                    <div className="w-10 h-10 rounded-full bg-white text-[#156E33] flex items-center justify-center shadow-xs">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1B3B5A]">Belum Ada Foto e-KTP</p>
                      <p className="text-[10px] text-[#5C635E]">
                        Ambil foto atau unggah berkas untuk menjalankan OCR
                      </p>
                    </div>
                  </div>
                )}

                {/* OCR Status & Upload Controls */}
                <div className="sm:col-span-7 space-y-3">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold w-full transition-colors ${
                      ocrStatus === 'scanning'
                        ? 'bg-blue-50 text-blue-700'
                        : ocrStatus === 'success'
                        ? 'bg-[#E4F2E7] text-[#156E33]'
                        : ocrStatus === 'partial'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-[#EBE6DC] text-[#5C635E]'
                    }`}
                  >
                    {ocrStatus === 'scanning' ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    ) : ocrStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : ocrStatus === 'partial' ? (
                      <Info className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {ocrStatus === 'scanning'
                        ? `Memproses OCR: ${ocrProgress}%`
                        : ktpFile
                        ? `Berkas: ${ktpFile.name}`
                        : 'Menunggu Unggahan Foto e-KTP'}
                    </span>
                  </div>

                  <p className="text-xs text-[#5C635E] leading-relaxed">
                    Format didukung: JPG, PNG, atau HEIC (Maksimal 5MB). Pastikan e-KTP tidak
                    terpotong dan tidak terkena pantulan kilau lampu flash.
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={ocrStatus === 'scanning'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EBE6DC] hover:bg-[#DFD9CD] disabled:opacity-50 text-xs font-bold text-[#1C241E] transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {ktpFile ? 'Ambil Ulang' : 'Buka Kamera'}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={ocrStatus === 'scanning'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E2DA] hover:bg-[#FAF8F4] disabled:opacity-50 text-xs font-bold text-[#1C241E] transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {ktpFile ? 'Ganti Berkas' : 'Unggah Berkas'}
                    </button>
                    {ktpFile && ocrStatus !== 'scanning' && (
                      <button
                        type="button"
                        onClick={() => runOcrOnKtpImage(ktpFile)}
                        title="Pindai Ulang Dokumen"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Scan Ulang
                      </button>
                    )}
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
                      Data di bawah terisi otomatis dari pemindaian OCR. Anda dapat memeriksa dan
                      mengoreksi karakter teks apabila diperlukan.
                    </p>
                  </div>
                </div>

                {/* Badge Status Pembacaan */}
                <div className="shrink-0 self-start sm:self-auto">
                  {ocrStatus === 'scanning' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sedang Memindai...
                    </span>
                  ) : ocrStatus === 'success' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#156E33]" />
                      Terbaca Otomatis (Lengkap)
                    </span>
                  ) : ocrStatus === 'partial' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold">
                      <Info className="w-3.5 h-3.5" />
                      Terbaca Sebagian
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-stone-100 text-stone-600 text-[11px] font-medium">
                      Menunggu Pemindaian e-KTP
                    </span>
                  )}
                </div>
              </div>

              {/* Banner Info Status OCR */}
              {ocrMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    ocrStatus === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : ocrStatus === 'partial'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : ocrStatus === 'scanning'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-stone-50 text-stone-700 border border-stone-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{ocrMessage}</span>
                </div>
              )}

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
                    placeholder="Nomor NIK 16 digit (Otomatis dari hasil pemindaian OCR)"
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#1C241E] outline-none placeholder:text-stone-400 placeholder:font-normal"
                  />
                  {nik && (
                    <button
                      type="button"
                      onClick={handleCopyNik}
                      title="Salin NIK"
                      className="px-3.5 py-2.5 text-[#5C635E] hover:text-[#156E33] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {copied && (
                  <p className="text-[11px] text-[#156E33] font-medium">NIK berhasil disalin!</p>
                )}
                {nik && nik.length !== 16 && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    NIK harus berjumlah 16 digit angka (saat ini: {nik.length} digit).
                  </p>
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
                    placeholder="Nama lengkap sesuai KTP (Otomatis dari OCR)"
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-2.5 text-sm font-medium text-[#1C241E] outline-none transition-colors placeholder:text-stone-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Tempat &amp; Tanggal Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={birthInfo}
                    placeholder="Contoh: Demak, 14 Mei 1978 (Otomatis dari OCR)"
                    onChange={(e) => {
                      setBirthInfo(e.target.value);
                      const parts = e.target.value.split(/[,/]/);
                      if (parts.length >= 2) {
                        setBirthPlace(parts[0].trim());
                        setBirthDate(parts.slice(1).join(',').trim());
                      }
                    }}
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-2.5 text-sm font-medium text-[#1C241E] outline-none transition-colors placeholder:text-stone-400"
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
                  placeholder="Alamat lengkap, RT/RW, Kelurahan, Kecamatan, Kota (Otomatis dari OCR)"
                  onChange={(e) => setKtpAddress(e.target.value)}
                  className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-4 py-3 text-sm font-medium text-[#1C241E] leading-relaxed outline-none resize-none transition-colors placeholder:text-stone-400"
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

              {/* Status Validasi Sebelum Kirim */}
              {!canSubmit && (
                <div className="p-3 rounded-xl bg-stone-100 text-stone-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {!ktpFile && !ktpPreviewUrl
                      ? 'Langkah 1: Unggah atau ambil foto e-KTP terlebih dahulu untuk memulai pemindaian OCR.'
                      : ocrStatus === 'scanning'
                      ? 'Langkah 2: Sedang memindai teks dokumen e-KTP dengan OCR, mohon tunggu...'
                      : !isFormComplete
                      ? 'Langkah 3: Pastikan seluruh kolom data (NIK 16 digit, Nama, TTL, Alamat) telah terisi lengkap.'
                      : 'Centang persetujuan pemrosesan data untuk mengaktifkan tombol verifikasi.'}
                  </span>
                </div>
              )}

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={!canSubmit}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#156E33] hover:bg-[#105728] disabled:bg-stone-300 disabled:cursor-not-allowed disabled:text-stone-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : ocrStatus === 'scanning' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting
                    ? 'Mengirim Dokumen...'
                    : ocrStatus === 'scanning'
                    ? 'Sedang Memindai OCR...'
                    : isFormComplete
                    ? 'Kirim Dokumen Verifikasi Sekarang'
                    : 'Lengkapi Data OCR Terlebih Dahulu'}
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
