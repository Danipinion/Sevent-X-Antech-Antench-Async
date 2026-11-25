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
  { value: "farmer", title: "Petani", desc: "Jual hasil panen", icon: Sprout, iconBg: "bg-[#e3f3e8]", iconColor: "text-[#185b32]" },
  { value: "middleman", title: "Tengkulak", desc: "Beli dan angkut", icon: Truck, iconBg: "bg-[#f6e8df]", iconColor: "text-[#a0521d]" },
  { value: "buyer", title: "Pembeli", desc: "Belanja langsung", icon: Store, iconBg: "bg-[#fbf0cf]", iconColor: "text-[#9a6b00]" },
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

const labelClass = "block pl-1 text-[12px] font-medium text-[#52617a]";
const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 text-[#91a2bd]";

/* ---------- API ---------- */

const WILAYAH_API = "https://api.kodewilayah.web.id";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/reverse";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const REGISTER_ENDPOINT = `${API_URL}/api/v1/auth/register`;

// Tampilkan laporan diagnosa GPS di dialog (hanya saat npm run dev)
const DEBUG_GPS = import.meta.env.DEV;

/* ---------- Helper ---------- */

const notify = (
  icon: "success" | "warning" | "error",
  title: string,
  text: string,
  extra: Record<string, unknown> = {}
) => Swal.fire({ icon, title, text, confirmButtonColor: "#185b32", ...extra });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const escapeHtml = (s: string) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

/* ---------- Wilayah ---------- */

type Wilayah = { code: number | string; name: string };

const fetchWilayah = async (path: string): Promise<Wilayah[]> => {
  const res = await axios.get(`${WILAYAH_API}${path}`);
  return res.data?.success ? res.data.data : [];
};

const normalizeWilayah = (name: string) =>
  name
    .toLowerCase()
    .replace(/daerah khusus ibu ?kota/g, "dki")
    .replace(/daerah istimewa/g, "di")
    .replace(
      /^(kabupaten administrasi|kabupaten|kab\.|kota administrasi|kota adm\.|kota|kecamatan|kec\.|kelurahan|kel\.|desa)\s*/i,
      ""
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();

const findWilayah = (
  items: Wilayah[],
  names: (string | undefined)[],
  exactOnly = false
) => {
  const raws = names.filter((n): n is string => Boolean(n));

  // 0. Cocok persis dengan awalan ("Kota Madiun" ≠ "Kabupaten Madiun")
  for (const raw of raws) {
    const hit = items.find((i) => i.name.toLowerCase() === raw.toLowerCase());
    if (hit) return hit;
  }

  const targets = raws.map(normalizeWilayah).filter(Boolean);

  // 1. Cocok persis (tanpa awalan)
  for (const t of targets) {
    const exact = items.find((i) => normalizeWilayah(i.name) === t);
    if (exact) return exact;
  }

  if (exactOnly) return;

  // 2. Cocok sebagian, hanya jika hasilnya tunggal
  for (const t of targets) {
    if (t.length < 4) continue;

    const hits = items.filter((i) => {
      const n = normalizeWilayah(i.name);
      return n.length >= 4 && (n.includes(t) || t.includes(n));
    });

    if (hits.length === 1) return hits[0];
  }
};

/* ---------- Deteksi Wilayah dari GPS ---------- */

type Level = "province" | "regency" | "district" | "village";

type Detected = {
  address: string;
  province?: Wilayah;
  regency?: Wilayah;
  district?: Wilayah;
  village?: Wilayah;
  log: string[];
};

// Field Nominatim yang mungkin berisi nama tiap level (tidak konsisten di Indonesia)
const KEYS: Record<Level, string[]> = {
  province: ["state", "province"],
  regency: ["city", "county", "municipality", "regency", "town", "state_district"],
  district: ["city_district", "district", "subdistrict", "suburb", "municipality"],
  village: ["village", "suburb", "neighbourhood", "quarter", "hamlet", "residential"],
};

const SKIP_KEYS = ["postcode", "country", "country_code", "road", "house_number"];

const reverseGeocode = async (lat: number, lng: number, zoom: number) => {
  const res = await axios.get(NOMINATIM_API, {
    params: {
      format: "jsonv2",
      lat,
      lon: lng,
      zoom,
      addressdetails: 1,
      "accept-language": "id",
    },
  });

  return res.data;
};

// Semua nama yang ada di respons Nominatim
const collectNames = (data: any): string[] =>
  [
    data?.name,
    ...Object.entries(data?.address ?? {})
      .filter(
        ([k, v]) =>
          !SKIP_KEYS.includes(k) && !k.startsWith("ISO3166") && typeof v === "string"
      )
      .map(([, v]) => v as string),
    ...String(data?.display_name ?? "").split(",").map((s) => s.trim()),
  ].filter(Boolean);

const detectWilayah = async (lat: number, lng: number): Promise<Detected> => {
  const log: string[] = [];
  const names: Record<Level, (string | undefined)[]> = {
    province: [],
    regency: [],
    district: [],
    village: [],
  };
  const all: string[] = [];

  const addNames = (data: any, extra = false) => {
    const a = data?.address ?? {};

    (Object.keys(KEYS) as Level[]).forEach((l) =>
      names[l].push(...KEYS[l].map((k) => a[k]))
    );

    // Zoom rendah: nama objek bisa berupa kecamatan/desa (bukan kota/kabupaten/provinsi)
    if (extra && data?.name && !/^(kota|kabupaten|provinsi)\b/i.test(data.name)) {
      names.district.push(data.name);
      names.village.push(data.name);
    }

    all.push(...collectNames(data));
  };

  const match = (items: Wilayah[], level: Level) => {
    let list = items;

    // "Madiun" bisa Kota atau Kabupaten -> tentukan dari nama yang dikirim Nominatim
    if (level === "regency") {
      const isKota = all.some((n) => /^kota\b/i.test(n));
      const isKab = all.some((n) => /^kabupaten\b/i.test(n));

      if (isKota !== isKab) {
        list = items.filter((i) => /^kota\b/i.test(i.name) === isKota);
      }
    }

    return findWilayah(list, names[level]) ?? findWilayah(list, all, true);
  };

  const first = await reverseGeocode(lat, lng, 18);
  if (!first?.address) throw new Error("Nominatim tidak mengembalikan alamat");

  addNames(first);
  log.push(`Nominatim zoom 18: ${collectNames(first).join(" | ")}`);

  const result: Detected = { address: "", log };

  /* Provinsi */
  result.province = match(await fetchWilayah("/provinces"), "province");
  log.push(`Provinsi: ${result.province?.name ?? "TIDAK COCOK"}`);

  /* Kabupaten / Kota */
  let districtItems: Wilayah[] = [];

  if (result.province) {
    result.regency = match(
      await fetchWilayah(`/regencies/${result.province.code}`),
      "regency"
    );
    log.push(`Kabupaten/Kota: ${result.regency?.name ?? "TIDAK COCOK"}`);
  }

  /* Kecamatan & Desa */
  if (result.regency) {
    districtItems = await fetchWilayah(`/districts/${result.regency.code}`);

    const villageCache = new Map<string, Wilayah[]>();
    const getVillages = async (code: number | string) => {
      const key = String(code);
      if (!villageCache.has(key)) {
        villageCache.set(key, await fetchWilayah(`/villages/${key}`));
      }
      return villageCache.get(key) as Wilayah[];
    };

    const resolveLower = async () => {
      let district = match(districtItems, "district");
      let village: Wilayah | undefined;

      if (district) {
        village = match(await getVillages(district.code), "village");
      }

      // Cari desa di semua kecamatan jika belum ketemu (5 request sekaligus)
      if (!village && names.village.some(Boolean)) {
        for (let i = 0; i < districtItems.length && !village; i += 5) {
          const hits = await Promise.all(
            districtItems.slice(i, i + 5).map(async (d) => {
              try {
                const v = findWilayah(await getVillages(d.code), names.village, true);
                return v ? { d, v } : null;
              } catch {
                return null;
              }
            })
          );

          const hit = hits.find(Boolean);
          if (hit) {
            district = hit.d;
            village = hit.v;
          }
        }
      }

      return { district, village };
    };

    let { district, village } = await resolveLower();

    // Belum lengkap -> tanya Nominatim di level zoom yang lebih umum
    for (const zoom of [14, 13, 12]) {
      if (district && village) break;

      await sleep(1100); // batas Nominatim: 1 request/detik

      try {
        const data = await reverseGeocode(lat, lng, zoom);
        addNames(data, true);
        log.push(`Nominatim zoom ${zoom}: ${collectNames(data).join(" | ")}`);

        ({ district, village } = await resolveLower());
      } catch {
        log.push(`Nominatim zoom ${zoom}: gagal diakses`);
      }
    }

    result.district = district;
    result.village = village;
    log.push(`Kecamatan: ${district?.name ?? "TIDAK COCOK"}`);
    log.push(`Desa/Kelurahan: ${village?.name ?? "TIDAK COCOK"}`);
  }

  // Alamat: pakai nama resmi bila ada, jika tidak pakai nama dari Nominatim
  const firstName = (l: Level) => names[l].find(Boolean);

  result.address = [
    result.village?.name ?? firstName("village"),
    result.district?.name ?? firstName("district"),
    result.regency?.name ?? firstName("regency"),
    result.province?.name ?? firstName("province"),
  ]
    .filter(Boolean)
    .join(", ");

  return result;
};

/* ---------- Hook Data Wilayah ---------- */

function useWilayah(path: string | null) {
  const [items, setItems] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems([]);

    if (!path) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetchWilayah(path)
      .then((data) => active && setItems(data))
      .catch(() => {})
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
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
        <option value="">{loading ? "Memuat..." : placeholder}</option>

        {items.map((item) => (
          <option key={item.code} value={String(item.code)} className="text-[#333]">
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
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
  const regencies = useWilayah(provinceCode ? `/regencies/${provinceCode}` : null);
  const districts = useWilayah(regencyCode ? `/districts/${regencyCode}` : null);
  const villages = useWilayah(districtCode ? `/villages/${districtCode}` : null);

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
      notify("warning", "Lokasi tidak tersedia", "Browser kamu tidak mendukung fitur lokasi.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setCoords({ lat: latitude, lng: longitude });

        try {
          const r = await detectWilayah(latitude, longitude);

          console.log("Diagnosa GPS:\n" + r.log.join("\n"));

          setAddress(r.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

          if (r.province) setProvinceCode(String(r.province.code));
          if (r.regency) setRegencyCode(String(r.regency.code));
          if (r.district) setDistrictCode(String(r.district.code));
          if (r.village) setVillageCode(String(r.village.code));

          if (r.province && r.regency && r.district && r.village) {
            await notify(
              "success",
              "Lokasi Berhasil Dideteksi",
              "Alamat dan pilihan wilayah berhasil diisi secara otomatis."
            );
          } else {
            const msg =
              "Lokasi GPS berhasil didapatkan, tetapi beberapa wilayah tidak dapat dicocokkan. Silakan periksa dan lengkapi dropdown wilayah secara manual.";

            await notify(
              "warning",
              "Wilayah Belum Lengkap",
              DEBUG_GPS ? "" : msg,
              DEBUG_GPS
                ? {
                    html: `<p style="margin-bottom:8px">${msg}</p>
                      <pre style="text-align:left;font-size:11px;white-space:pre-wrap;background:#f4f6f8;padding:8px;border-radius:8px">${escapeHtml(
                        r.log.join("\n")
                      )}</pre>`,
                  }
                : {}
            );
          }
        } catch (error) {
          console.error("Gagal mendeteksi wilayah:", error);

          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

          await notify(
            "error",
            "Gagal Mendeteksi Alamat",
            "Layanan pencarian alamat tidak dapat dihubungi. Isi alamat dan wilayah secara manual."
          );
        } finally {
          setLocating(false);
        }
      },

      () => {
        setLocating(false);
        notify("warning", "Lokasi tidak bisa diakses", "Izinkan akses lokasi di browser, lalu coba lagi.");
      },

      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ---------- Submit Register ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!role) {
      notify("warning", "Role belum dipilih", "Silakan pilih jenis akun terlebih dahulu.");
      return;
    }

    if (!coords) {
      notify(
        "warning",
        "Titik lokasi belum dipilih",
        "Tekan ikon target di kolom Alamat untuk mengambil lokasi GPS kamu."
      );
      return;
    }

    if (!provinceCode || !regencyCode || !districtCode || !villageCode) {
      notify(
        "warning",
        "Wilayah belum lengkap",
        "Silakan lengkapi Provinsi, Kabupaten/Kota, Kecamatan, dan Desa."
      );
      return;
    }

    const nameOf = (list: Wilayah[], code: string) =>
      list.find((item) => String(item.code) === code)?.name ?? "";

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

      await notify(
        "success",
        "Pendaftaran Berhasil",
        "Akun kamu sudah dibuat. Silakan masuk untuk melanjutkan.",
        { confirmButtonText: "Masuk Sekarang", allowOutsideClick: false }
      );

      navigate("/login");
    } catch (err) {
      let message = "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.";

      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;
        const msg = String(data?.message ?? data?.error ?? "").toLowerCase();
        const field = String(data?.field ?? data?.errors?.[0]?.field ?? "").toLowerCase();
        const duplicate = /already|exist|terdaftar|duplicate/.test(msg);

        if (field === "nik" || (msg.includes("nik") && duplicate)) {
          message = "NIK sudah terdaftar. Silakan gunakan NIK lain.";
        } else if (
          ["phone", "no_hp", "phone_number"].includes(field) ||
          (/phone|nomor hp|no_hp/.test(msg) && duplicate)
        ) {
          message = "Nomor HP sudah terdaftar. Silakan gunakan nomor lain.";
        } else if (status === 409) {
          message = "NIK atau nomor HP sudah terdaftar. Silakan periksa kembali data kamu.";
        } else if (status >= 500) {
          message = "Server sedang mengalami gangguan. Silakan coba lagi nanti.";
        } else {
          message = "Pendaftaran gagal. Silakan periksa kembali data yang kamu masukkan.";
        }
      }

      await notify("error", "Pendaftaran Gagal", message, { confirmButtonText: "Coba Lagi" });
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
                <UserRound size={16} strokeWidth={1.8} className={iconClass} />

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
                <UserRound size={16} strokeWidth={1.8} className={iconClass} />

                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  minLength={16}
                  placeholder="Nomor Induk Kependudukan"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
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
                <MessageCircle size={16} strokeWidth={1.8} className={iconClass} />

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="tel"
                  placeholder="Nomor WhatsApp / HP Aktif (cth: 08123456789)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
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
                {ROLES.map(({ value, title, desc, icon: Icon, iconBg, iconColor }) => {
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
                        <Icon size={15} strokeWidth={1.9} className={iconColor} />
                      </span>

                      <span className="text-[12px] font-semibold text-[#191919]">
                        {title}
                      </span>

                      <span className="mt-0.5 text-[11px] leading-4 text-[#77736a]">
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alamat */}
            <div className="space-y-2">
              <label htmlFor="address" className={labelClass}>
                Alamat
              </label>

              <div className="relative">
                <MapPin size={16} strokeWidth={1.8} className={iconClass} />

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
                  Titik GPS tersimpan ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
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
                <LockKeyhole size={16} strokeWidth={1.8} className={iconClass} />

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
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
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

              <label htmlFor="agree" className="cursor-pointer text-[12px] text-[#52617a]">
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
              className="font-semibold text-[#00865b] transition-colors hover:text-[#006b48]"
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