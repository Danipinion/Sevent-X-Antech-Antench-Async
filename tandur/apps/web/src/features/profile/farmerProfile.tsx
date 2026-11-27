import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
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
  LocateFixed,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { fetchApi, type UserDomain } from '@/services/api';

interface ProfilePageProps {
  role?: "farmer" | "middleman" | "buyer";
}

export default function FarmerProfilePage({ role }: ProfilePageProps = {}) {
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const currentRole = role || storedUser?.role || "farmer";
  const isMiddleman = currentRole === "middleman";

  const defaultName = storedUser?.name || (isMiddleman ? "Haji Supardi" : "Sugeng Santoso");
  const defaultNik = storedUser?.nik || (isMiddleman ? "3521092804750008" : "3521092804750002");
  const defaultPhone = storedUser?.phone || (isMiddleman ? "813-2890-5678" : "812-8990-1234");
  const defaultEmail =
    storedUser?.email ||
    (isMiddleman ? "supardi.tengkulak.demak@gmail.com" : "sugeng.santoso.tani@gmail.com");
  const defaultAddress =
    storedUser?.ktp_address ||
    (isMiddleman
      ? "Gudang Komoditas Utama Demak, Jl. Raya Pantura No. 45, Kec. Karanganyar, Kab. Demak, Jawa Tengah"
      : "Desa Karangawen, RT 03 / RW 02, Kec. Karangawen, Kab. Demak, Jawa Tengah\n(Patokan: Sebelah Barat Penggilingan Padi Berkah)");

  const memberId = storedUser?.id
    ? storedUser.id.startsWith("usr_")
      ? `TNDR-${storedUser.id.substring(4, 12).toUpperCase()}`
      : storedUser.id
    : isMiddleman
    ? "TNDR-TGLK-1092"
    : "TNDR-DMK-2804";

  const [fullName, setFullName] = useState<string>(defaultName);
  const [nik, setNik] = useState<string>(defaultNik);
  const [whatsappNumber, setWhatsappNumber] = useState<string>(defaultPhone);
  const [email, setEmail] = useState<string>(defaultEmail);
  const [address, setAddress] = useState<string>(defaultAddress);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    storedUser?.lat && storedUser?.lng
      ? { lat: Number(storedUser.lat), lng: Number(storedUser.lng) }
      : null
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch profil dari backend API saat komponen di-mount
  useEffect(() => {
    let isMounted = true;
    async function loadUserProfile() {
      try {
        const res = await fetchApi<{ data?: UserDomain } | UserDomain>('/users/profile');
        const user = (res as any)?.data ?? res;
        if (isMounted && user) {
          if (user.name) setFullName(user.name);
          if (user.nik) setNik(user.nik);
          if (user.phone) {
            setWhatsappNumber(user.phone.replace(/^\+?62/, ''));
          }
          if (user.email) setEmail(user.email);
          if (user.ktp_address) setAddress(user.ktp_address);
          if (user.latitude && user.longitude) {
            setCoords({ lat: Number(user.latitude), lng: Number(user.longitude) });
          }
        }
      } catch {
        // Fallback tetap menggunakan data yang tersimpan di localStorage / default
      }
    }
    loadUserProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: "error",
        title: "Browser Tidak Mendukung GPS",
        text: "Perangkat atau browser Anda tidak mendukung akses lokasi otomatis.",
        confirmButtonColor: "#156E33",
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setCoords({ lat, lng });

        let resolvedAddress = "";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
          );
          if (response.ok) {
            const geoData = await response.json();
            if (geoData?.display_name) {
              resolvedAddress = geoData.display_name;
            }
          }
        } catch {
          // Jika reverse geocoding gagal/offline, tetap isi koordinat GPS
        }

        const formattedText = resolvedAddress
          ? `${resolvedAddress}\n(Titik Koordinat GPS: ${lat}, ${lng})`
          : `Titik Lokasi Terdeteksi (Koordinat GPS: ${lat}, ${lng})`;

        setAddress(formattedText);
        setIsLocating(false);

        await Swal.fire({
          icon: "success",
          title: "Lokasi Terkini Ditemukan",
          text: "Alamat dan titik koordinat GPS berhasil dimasukkan ke kolom titik jemput.",
          timer: 1800,
          showConfirmButton: false,
        });
      },
      async (error) => {
        setIsLocating(false);
        let errorMsg = "Gagal mengakses lokasi perangkat Anda.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg =
            "Izin akses lokasi ditolak. Silakan aktifkan izin lokasi (GPS) pada browser Anda lalu coba lagi.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Informasi sinyal GPS tidak tersedia saat ini.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Waktu permintaan akses lokasi habis. Silakan coba kembali.";
        }

        await Swal.fire({
          icon: "warning",
          title: "Akses Lokasi Gagal",
          text: errorMsg,
          confirmButtonColor: "#156E33",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: fullName,
          phone: `+62${whatsappNumber.replace(/[^0-9]/g, '')}`,
          email,
          ktp_address: address,
          ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
        }),
      });

      if (storedUser) {
        const updated = {
          ...storedUser,
          name: fullName,
          phone: whatsappNumber,
          email,
          ktp_address: address,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        };
        localStorage.setItem('user', JSON.stringify(updated));
      }

      await Swal.fire({
        icon: "success",
        title: "Profil Berhasil Disimpan",
        text: "Informasi profil dan titik lokasi Anda telah diperbarui ke sistem.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch {
      if (storedUser) {
        const updated = {
          ...storedUser,
          name: fullName,
          phone: whatsappNumber,
          email,
          ktp_address: address,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        };
        localStorage.setItem('user', JSON.stringify(updated));
      }

      await Swal.fire({
        icon: "success",
        title: "Profil Berhasil Disimpan",
        text: "Informasi profil dan titik lokasi Anda telah disimpan.",
        timer: 1800,
        showConfirmButton: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EFECE6]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
              Data Diri {isMiddleman ? "Mitra Tengkulak" : "Petani"}
            </h1>
            <p className="text-xs sm:text-sm text-[#5C635E]">
              {isMiddleman
                ? "Kelola informasi identitas resmi dan kontak aktif Anda untuk kelancaran pengadaan komoditas dan logistik gudang."
                : "Kelola informasi identitas resmi dan kontak aktif Anda untuk kelancaran verifikasi timbang gabah serta transfer hasil panen."}
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
                  {isMiddleman
                    ? "Data ini digunakan sebagai dasar kerja sama pengadaan dan distribusi hasil panen."
                    : "Data ini digunakan sebagai dasar hukum akad jual beli gabah."}
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#EFECE6] text-xs font-semibold text-[#5C635E]">
              ID: {memberId}
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
                <span>{fullName}</span>
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
                <span>{nik}</span>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#1C241E]">
                Alamat Domisili &amp; Titik Kumpul Hasil Panen
              </label>

              <div className="flex items-center gap-3">
                {coords && (
                  <a
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#156E33] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Google Maps
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDF3E7] hover:bg-[#F9E6CE] text-xs font-bold text-[#9A4D16] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  {isLocating ? "Mendeteksi GPS..." : "Gunakan Lokasi Saat Ini"}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white p-4 transition-colors">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                title="Klik untuk ambil lokasi saat ini"
                className="p-1.5 -m-1 rounded-lg hover:bg-[#E8F5EC] text-[#156E33] transition-colors shrink-0 mt-0.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Klik 'Gunakan Lokasi Saat Ini' atau ketik alamat lengkap titik jemput armada..."
                className="w-full bg-transparent text-sm font-medium text-[#1C241E] leading-relaxed outline-none resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#7A827C]">
              <p className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                Digunakan sopir truk Tandur saat menjemput gabah basah langsung dari tepi sawah.
              </p>
              {coords && (
                <span className="font-mono text-[#156E33] font-semibold">
                  GPS: {coords.lat}, {coords.lng}
                </span>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-[#F2EFE9] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setAddress(defaultAddress);
                setCoords(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#EFECE6] hover:bg-[#E5E1D8] text-sm font-bold text-[#1C241E] transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#156E33] hover:bg-[#105728] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}