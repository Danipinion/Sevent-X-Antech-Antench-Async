
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import {
  UserRound,
  LockKeyhole,
  MessageCircle,
  MapPin,
  Crosshair,
  Sprout,
  Truck,
  Store,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

type Role = "farmer" | "middleman" | "buyer";

const ROLES: {
  value: Role;
  title: string;
  desc: string;
  icon: typeof Sprout;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    value: "farmer",
    title: "Petani",
    desc: "Jual hasil panen",
    icon: Sprout,
    iconBg: "bg-[#e3f3e8]",
    iconColor: "text-[#185b32]",
  },
  {
    value: "middleman",
    title: "Tengkulak",
    desc: "Beli dan angkut",
    icon: Truck,
    iconBg: "bg-[#f6e8df]",
    iconColor: "text-[#a0521d]",
  },
  {
    value: "buyer",
    title: "Pembeli",
    desc: "Belanja langsung",
    icon: Store,
    iconBg: "bg-[#fbf0cf]",
    iconColor: "text-[#9a6b00]",
  },
];

const inputClass = `
  h-[46px] w-full rounded-[16px]
  border border-[#dfe6ef]
  bg-[#f7f9fb]
  pl-11 pr-4
  text-[14px] text-[#333]
  outline-none transition-all
  placeholder:text-[#91a2bd]
  focus:border-[#185b32]
  focus:ring-2 focus:ring-[#185b32]/10
`;

const labelClass = "block pl-1 text-[12px] font-medium text-[#52617a]";
const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 text-[#91a2bd]";

/* ---------- API ---------- */

const WILAYAH_API = "https://api.kodewilayah.web.id";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const REGISTER_ENDPOINT = `${API_URL}/api/v1/auth/register`;

/* ---------- Wilayah ---------- */

type Wilayah = {
  code: number | string;
  name: string;
};

const selectClass = `
  h-[46px] w-full appearance-none rounded-[16px]
  border border-[#dfe6ef]
  bg-[#f7f9fb]
  pl-4 pr-10
  text-[14px] text-[#333]
  outline-none transition-all
  focus:border-[#185b32]
  focus:ring-2 focus:ring-[#185b32]/10
  disabled:cursor-not-allowed disabled:opacity-60
`;

/* ---------- Normalisasi Nama Wilayah ---------- */

const normalizeWilayah = (name: string) =>
  name
    .toLowerCase()
    .replace(
      /^(kabupaten|kab\.|kota administrasi|kota|kecamatan|kelurahan|desa)\s*/i,
      ""
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

/* ---------- Mencari Wilayah ---------- */

const findWilayah = (items: Wilayah[], names: string[]) => {
  return items.find((item) =>
    names.some(
      (name) =>
        name &&
        normalizeWilayah(item.name) === normalizeWilayah(name)
    )
  );
};

/* ---------- API Wilayah ---------- */

function useWilayah(path: string | null) {
  const [items, setItems] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems([]);

    if (!path) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);

    axios
      .get(`${WILAYAH_API}${path}`, {
        signal: controller.signal,
      })
      .then((res) => {
        setItems(res.data?.success ? res.data.data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [path]);

  return { items, loading };
}

/* ---------- Komponen Select Wilayah ---------- */

type WilayahSelectProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  items: Wilayah[];
  loading: boolean;
  disabled: boolean;
};

const WilayahSelect = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  items,
  loading,
  disabled,
}: WilayahSelectProps) => (
  <div className="min-w-0 space-y-2">
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>

    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        required
        className={`${selectClass} ${value ? "" : "text-[#91a2bd]"}`}
      >
        <option value="">
          {loading ? "Memuat..." : placeholder}
        </option>

        {items.map((item) => (
          <option
            key={item.code}
            value={String(item.code)}
            className="text-[#333]"
          >
            {item.name}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        strokeWidth={1.8}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#91a2bd]"
      />
    </div>
  </div>
);

/* ---------- Page Register ---------- */

const Register = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | "">("");

  const [address, setAddress] = useState("");

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [locating, setLocating] = useState(false);

  const [provinceCode, setProvinceCode] = useState("");
  const [regencyCode, setRegencyCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [villageCode, setVillageCode] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Data Wilayah ---------- */

  const provinces = useWilayah("/provinces");

  const regencies = useWilayah(
    provinceCode ? `/regencies/${provinceCode}` : null
  );

  const districts = useWilayah(
    regencyCode ? `/districts/${regencyCode}` : null
  );

  const villages = useWilayah(
    districtCode ? `/villages/${districtCode}` : null
  );

  /* ---------- Pilihan Wilayah Manual ---------- */

  const handleProvince = (code: string) => {
    setProvinceCode(code);
    setRegencyCode("");
    setDistrictCode("");
    setVillageCode("");
  };

  const handleRegency = (code: string) => {
    setRegencyCode(code);
    setDistrictCode("");
    setVillageCode("");
  };

  const handleDistrict = (code: string) => {
    setDistrictCode(code);
    setVillageCode("");
  };

  /* ---------- Deteksi Lokasi GPS ---------- */

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: "warning",
        title: "Lokasi tidak tersedia",
        text: "Browser kamu tidak mendukung fitur lokasi.",
        confirmButtonColor: "#185b32",
      });

      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Simpan koordinat GPS
        setCoords({
          lat: latitude,
          lng: longitude,
        });

        try {
          // 1. Reverse Geocoding menggunakan Nominatim
          const res = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                format: "jsonv2",
                lat: latitude,
                lon: longitude,
                "accept-language": "id",
              },
            }
          );

          const addr = res.data?.address;

          if (!addr) {
            throw new Error("Data alamat tidak ditemukan");
          }

          // 2. Ambil nama wilayah dari hasil GPS
          const desa =
            addr.village ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.hamlet ||
            addr.quarter ||
            "";

          const kecamatan =
            addr.city_district ||
            addr.district ||
            addr.subdistrict ||
            "";

          const kabupaten =
            addr.city ||
            addr.county ||
            addr.municipality ||
            "";

          const provinsi = addr.state || "";

          // 3. Isi alamat secara otomatis
          const formattedAddress = [
            desa,
            kecamatan,
            kabupaten,
            provinsi,
          ]
            .filter(Boolean)
            .join(", ");

          setAddress(
            formattedAddress ||
              `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          );

          // 4. Ambil daftar provinsi
          const provinceRes = await axios.get(
            `${WILAYAH_API}/provinces`
          );

          const provinceItems: Wilayah[] =
            provinceRes.data?.success
              ? provinceRes.data.data
              : [];

          const selectedProvince = findWilayah(
            provinceItems,
            [provinsi]
          );

          if (!selectedProvince) {
            throw new Error("Provinsi tidak ditemukan");
          }

          setProvinceCode(String(selectedProvince.code));

          // 5. Ambil kabupaten/kota berdasarkan provinsi
          const regencyRes = await axios.get(
            `${WILAYAH_API}/regencies/${selectedProvince.code}`
          );

          const regencyItems: Wilayah[] =
            regencyRes.data?.success
              ? regencyRes.data.data
              : [];

          const selectedRegency = findWilayah(
            regencyItems,
            [kabupaten]
          );

          if (!selectedRegency) {
            throw new Error("Kabupaten tidak ditemukan");
          }

          setRegencyCode(String(selectedRegency.code));

          // 6. Ambil kecamatan berdasarkan kabupaten
          const districtRes = await axios.get(
            `${WILAYAH_API}/districts/${selectedRegency.code}`
          );

          const districtItems: Wilayah[] =
            districtRes.data?.success
              ? districtRes.data.data
              : [];

          const selectedDistrict = findWilayah(
            districtItems,
            [kecamatan]
          );

          if (!selectedDistrict) {
            throw new Error("Kecamatan tidak ditemukan");
          }

          setDistrictCode(String(selectedDistrict.code));

          // 7. Ambil desa berdasarkan kecamatan
          const villageRes = await axios.get(
            `${WILAYAH_API}/villages/${selectedDistrict.code}`
          );

          const villageItems: Wilayah[] =
            villageRes.data?.success
              ? villageRes.data.data
              : [];

          const selectedVillage = findWilayah(
            villageItems,
            [desa]
          );

          if (!selectedVillage) {
            throw new Error("Desa tidak ditemukan");
          }

          setVillageCode(String(selectedVillage.code));
          await Swal.fire({
            icon: "success",
            title: "Lokasi Berhasil Dideteksi",
            text: "Alamat dan pilihan wilayah berhasil diisi secara otomatis.",
            confirmButtonColor: "#185b32",
          });

        } catch (error) {
          console.error("Gagal mendeteksi wilayah:", error);

          await Swal.fire({
            icon: "warning",
            title: "Wilayah Belum Lengkap",
            text: "Lokasi GPS berhasil didapatkan, tetapi beberapa wilayah tidak dapat dicocokkan. Silakan periksa dan lengkapi dropdown wilayah secara manual.",
            confirmButtonColor: "#185b32",
          });

        } finally {
          setLocating(false);
        }
      },

      // Jika GPS gagal
      () => {
        setLocating(false);

        Swal.fire({
          icon: "warning",
          title: "Lokasi tidak bisa diakses",
          text: "Izinkan akses lokasi di browser, lalu coba lagi.",
          confirmButtonColor: "#185b32",
        });
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  /* ---------- Submit Register ---------- */

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (submitting) return;

    if (!role) {
      Swal.fire({
        icon: "warning",
        title: "Role belum dipilih",
        text: "Silakan pilih jenis akun terlebih dahulu.",
        confirmButtonColor: "#185b32",
      });

      return;
    }

    if (!coords) {
      Swal.fire({
        icon: "warning",
        title: "Titik lokasi belum dipilih",
        text: "Tekan ikon target di kolom Alamat untuk mengambil lokasi GPS kamu.",
        confirmButtonColor: "#185b32",
      });

      return;
    }

    if (
      !provinceCode ||
      !regencyCode ||
      !districtCode ||
      !villageCode
    ) {
      Swal.fire({
        icon: "warning",
        title: "Wilayah belum lengkap",
        text: "Silakan lengkapi Provinsi, Kabupaten/Kota, Kecamatan, dan Desa.",
        confirmButtonColor: "#185b32",
      });

      return;
    }

    const nameOf = (list: Wilayah[], code: string) =>
      list.find(
        (item) => String(item.code) === code
      )?.name ?? "";

    const registerData = {
      name: fullName,
      nik,
      phone,
      password,
      role,
      address,

      village: nameOf(villages.items, villageCode),
      district: nameOf(districts.items, districtCode),
      city: nameOf(regencies.items, regencyCode),
      province: nameOf(provinces.items, provinceCode),

      // Kode wilayah BPS
      village_code: villageCode,
      district_code: districtCode,
      city_code: regencyCode,
      province_code: provinceCode,

      latitude: coords.lat,
      longitude: coords.lng,
    };

    setSubmitting(true);

    try {
      await axios.post(REGISTER_ENDPOINT, registerData);

      await Swal.fire({
        icon: "success",
        title: "Pendaftaran Berhasil",
        text: "Akun kamu sudah dibuat. Silakan masuk untuk melanjutkan.",
        confirmButtonText: "Masuk Sekarang",
        confirmButtonColor: "#185b32",
        allowOutsideClick: false,
      });

      navigate("/login");

    } catch (err) {
      let message =
        "Terjadi kesalahan. Silakan coba lagi nanti.";

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        const backendMessage = String(
          data?.message ?? data?.error ?? ""
        ).toLowerCase();

        const errorField = String(
          data?.field ?? data?.errors?.[0]?.field ?? ""
        ).toLowerCase();

        // NIK sudah terdaftar
        if (
          errorField === "nik" ||
          (
            backendMessage.includes("nik") &&
            /already|exist|terdaftar|duplicate/.test(
              backendMessage
            )
          )
        ) {
          message =
            "NIK sudah terdaftar. Silakan gunakan NIK lain.";
        }

        // Nomor HP sudah terdaftar
        else if (
          ["phone", "no_hp", "phone_number"].includes(errorField) ||
          (
            /phone|nomor hp|no_hp/.test(backendMessage) &&
            /already|exist|terdaftar|duplicate/.test(
              backendMessage
            )
          )
        ) {
          message =
            "Nomor HP sudah terdaftar. Silakan gunakan nomor lain.";
        }

        // Konflik data lainnya
        else if (status === 409) {
          message =
            "NIK atau nomor HP sudah terdaftar. Silakan periksa kembali data kamu.";
        }

        // Kesalahan server
        else if (status && status >= 500) {
          message =
            "Server sedang mengalami gangguan. Silakan coba lagi nanti.";
        }

        // Kesalahan lainnya
        else {
          message =
            "Pendaftaran gagal. Silakan periksa kembali data yang kamu masukkan.";
        }

        console.error("Register gagal. Status:", status);

      } else {
        message =
          "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.";
      }

      await Swal.fire({
        icon: "error",
        title: "Pendaftaran Gagal",
        text: message,
        confirmButtonText: "Coba Lagi",
        confirmButtonColor: "#185b32",
      });

    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Tampilan ---------- */

  return (
    <main className="relative flex min-h-screen w-full items-center justify-end max-lg:justify-center overflow-x-hidden bg-white py-10">

      {/* Background Image - Desktop */}
      <div
        className="
          pointer-events-none fixed top-0 left-0 h-screen w-screen hidden lg:block
          bg-[url('/bg-auth.png')]
          bg-[length:100%_100%]
          bg-no-repeat
        "
      />

      {/* Register Container */}
      <section
        className="
          relative z-10
          mr-[6%] w-[35.5%]
          max-lg:mr-0
          max-lg:w-full
          max-lg:max-w-[480px]
          max-lg:px-6
        "
      >
        <div className="w-full">

          {/* Heading */}
          <div className="mb-5">
            <h1 className="text-[27px] font-bold tracking-tight text-[#191919]">
              Daftar Akun
            </h1>

            <p className="mt-1 text-[14px] leading-7">
              Lengkapi data untuk akses portal lelang &amp; pendataan panen.
            </p>
          </div>

          {/* Form Register */}
          <form onSubmit={handleSubmit} className="space-y-3.5">

            {/* Nama Lengkap */}
            <div className="space-y-2">
              <label htmlFor="fullName" className={labelClass}>
                Nama Lengkap
              </label>

              <div className="relative">
                <UserRound
                  size={16}
                  strokeWidth={1.8}
                  className={iconClass}
                />

                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* NIK */}
            <div className="space-y-2">
              <label htmlFor="nik" className={labelClass}>
                Nomor Induk Kependudukan
              </label>

              <div className="relative">
                <UserRound
                  size={16}
                  strokeWidth={1.8}
                  className={iconClass}
                />

                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  minLength={16}
                  placeholder="Nomor Induk Kependudukan"
                  value={nik}
                  onChange={(e) =>
                    setNik(e.target.value.replace(/\D/g, ""))
                  }
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Nomor HP */}
            <div className="space-y-2">
              <label htmlFor="phone" className={labelClass}>
                Nomor HP
              </label>

              <div className="relative">
                <MessageCircle
                  size={16}
                  strokeWidth={1.8}
                  className={iconClass}
                />

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="tel"
                  placeholder="Nomor WhatsApp / HP Aktif (cth: 08123456789)"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, ""))
                  }
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <span className={labelClass}>Role</span>

              <div
                role="radiogroup"
                aria-label="Pilih role"
                className="grid grid-cols-3 gap-3 max-sm:gap-2"
              >
                {ROLES.map(
                  ({
                    value,
                    title,
                    desc,
                    icon: Icon,
                    iconBg,
                    iconColor,
                  }) => {
                    const active = role === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRole(value)}
                        className={`
                          flex flex-col items-center rounded-[14px]
                          bg-white px-2 py-3.5 text-center
                          transition-all
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185b32]/30
                          ${
                            active
                              ? "border-2 border-[#185b32] shadow-[0_4px_10px_rgba(24,91,50,0.10)]"
                              : "border border-[#e7ebf1] hover:border-[#c9d3e0]"
                          }
                        `}
                      >
                        <span
                          className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}
                        >
                          <Icon
                            size={15}
                            strokeWidth={1.9}
                            className={iconColor}
                          />
                        </span>

                        <span className="text-[12px] font-semibold text-[#191919]">
                          {title}
                        </span>

                        <span className="mt-0.5 text-[11px] leading-4 text-[#77736a]">
                          {desc}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Alamat */}
            <div className="space-y-2">
              <label htmlFor="address" className={labelClass}>
                Alamat
              </label>

              <div className="relative">
                <MapPin
                  size={16}
                  strokeWidth={1.8}
                  className={iconClass}
                />

                <input
                  id="address"
                  type="text"
                  placeholder={
                    locating
                      ? "Mendeteksi lokasi..."
                      : "Desa, Kecamatan, Kabupaten/Kota, Provinsi"
                  }
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className={`${inputClass} pr-12 placeholder:text-[#91a2bd]`}
                />

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locating}
                  aria-label="Gunakan lokasi saat ini"
                  title="Gunakan lokasi saat ini"
                  className="
                    absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2
                    items-center justify-center rounded-full
                    bg-[#e3f3e8] text-[#185b32]
                    transition-colors hover:bg-[#d2ebdb]
                    disabled:opacity-60
                  "
                >
                  <Crosshair
                    size={13}
                    strokeWidth={2}
                    className={locating ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {coords && (
                <p className="pl-1 text-[11px] text-[#185b32]">
                  Titik GPS tersimpan (
                  {coords.lat.toFixed(5)},{" "}
                  {coords.lng.toFixed(5)}
                  )
                </p>
              )}
            </div>

            {/* Wilayah */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 max-sm:grid-cols-1">

              <WilayahSelect
                id="province"
                label="Provinsi"
                placeholder="Pilih Provinsi"
                value={provinceCode}
                onChange={handleProvince}
                items={provinces.items}
                loading={provinces.loading}
                disabled={false}
              />

              <WilayahSelect
                id="regency"
                label="Kabupaten / Kota"
                placeholder="Pilih Kab / Kota"
                value={regencyCode}
                onChange={handleRegency}
                items={regencies.items}
                loading={regencies.loading}
                disabled={!provinceCode}
              />

              <WilayahSelect
                id="district"
                label="Kecamatan"
                placeholder="Pilih Kecamatan"
                value={districtCode}
                onChange={handleDistrict}
                items={districts.items}
                loading={districts.loading}
                disabled={!regencyCode}
              />

              <WilayahSelect
                id="village"
                label="Kelurahan / Desa"
                placeholder="Pilih Kel / Desa"
                value={villageCode}
                onChange={setVillageCode}
                items={villages.items}
                loading={villages.loading}
                disabled={!districtCode}
              />
            </div>

            {/* Kata Sandi */}
            <div className="space-y-2">
              <label htmlFor="password" className={labelClass}>
                Kata Sandi
              </label>

              <div className="relative">
                <LockKeyhole
                  size={16}
                  strokeWidth={1.8}
                  className={iconClass}
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Kata Sandi Akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-11`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#91a2bd] transition-colors hover:text-[#52617a]"
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Syarat & Ketentuan */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="agree"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
                className="h-4 w-4 cursor-pointer rounded accent-[#185b32]"
              />

              <label
                htmlFor="agree"
                className="cursor-pointer text-[12px] text-[#52617a]"
              >
                Saya setuju dengan{" "}
                <a
                  href="/syarat-ketentuan"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#185b32] hover:underline"
                >
                  Syarat &amp; Ketentuan
                </a>{" "}
                TANDUR.
              </label>
            </div>

            {/* Button Register */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || locating}
              className="h-[48px] w-full rounded-[16px] text-[14px] font-semibold shadow-[0_7px_12px_rgba(0,0,0,0.16)] active:scale-[0.99]"
            >
              {submitting
                ? "Mendaftar..."
                : locating
                  ? "Mendeteksi Lokasi..."
                  : "Daftar Sekarang"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-[12px] text-[#66615b]">
            Sudah punya akun TANDUR?{" "}
            <Link
              to="/login"
              className="
                font-semibold text-[#00865b]
                transition-colors hover:text-[#006b48]
              "
            >
              Masuk di sini
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
};

export default Register;
