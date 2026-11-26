import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  User,
  X,
  MapPin,
  LogOut,
  UserCheck,
  LayoutDashboard,
} from "lucide-react";
import Swal from "sweetalert2";
import { getEffectiveCartCount } from "@/services/api";

const categories = [
  { label: "Beras & Gabah", slug: "beras-gabah", href: "/produk?kategori=beras-gabah" },
  { label: "Sayur Segar", slug: "sayur-segar", href: "/produk?kategori=sayur-segar" },
  { label: "Buah Panen", slug: "buah-panen", href: "/produk?kategori=buah-panen" },
  { label: "Peternakan & Bibit", slug: "peternakan-bibit", href: "/produk?kategori=peternakan-bibit" },
  { label: "Rempah & Bumbu", slug: "rempah-bumbu", href: "/produk?kategori=rempah-bumbu" },
];

const topLinks = [
  { label: "Mulai Jual Hasil Panen", href: "/jual" },
];

const NON_CITY_PREFIX =
  /^(?:jl\.?|jalan|gg\.?|gang|dsn\.?|dusun|ds\.?|desa|kel\.?|kelurahan|kec\.?|kecamatan|rt|rw|no\.?|blok|perum|perumahan|prov\.?|provinsi|jawa|sumatera|kalimantan|sulawesi|bali|papua|nusa|maluku|banten|dki|diy)\b/i;

function extractCityOnly(address?: string): string | null {
  if (!address || typeof address !== "string" || !address.trim()) return null;

  const explicitMatch = address.match(
    /\b(?:Kota|Kabupaten|Kab\.?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i
  );
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].trim();
  }

  const parts = address
    .split(",")
    .map((p) => p.replace(/\b\d{5}\b/g, "").trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const cleanPart = parts[i].replace(/^(?:Kota|Kabupaten|Kab\.?)\s+/i, "").trim();
      if (cleanPart && !NON_CITY_PREFIX.test(cleanPart)) {
        return cleanPart;
      }
    }
  }

  const withoutZip = address.replace(/\b\d{5}\b/g, "").trim();
  const words = withoutZip.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0];
  if (words.length > 1) {
    const lastWord = words[words.length - 1].replace(/[^A-Za-z]/g, "");
    if (lastWord && !/^(?:no|rt|rw|timur|barat|tengah|utara|selatan)$/i.test(lastWord)) {
      return lastWord;
    }
  }

  return null;
}

export default function Header({ cartCount = 0 }: { cartCount?: number }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveCartCount, setLiveCartCount] = useState<number>(cartCount);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const catNavRef = useRef<HTMLLIElement>(null);

  // Deteksi status user login
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (raw) {
        setUser(JSON.parse(raw));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Ambil jumlah item keranjang terpadu (backend + offline fallback)
  const fetchCartCount = useCallback(async () => {
    try {
      const count = await getEffectiveCartCount();
      setLiveCartCount(count);
    } catch {
      try {
        const rawLocal = localStorage.getItem("tandur_buyer_cart");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            setLiveCartCount(parsed.length);
          }
        }
      } catch {
        // abaikan
      }
    }
  }, []);

  useEffect(() => {
    if (typeof cartCount === "number" && cartCount > 0) {
      setLiveCartCount(cartCount);
    }
  }, [cartCount]);

  useEffect(() => {
    fetchCartCount();

    // Sinkronisasi otomatis saat ada perubahan keranjang dari halaman produk/keranjang
    const handleCartUpdated = () => fetchCartCount();
    window.addEventListener("cartUpdated", handleCartUpdated);
    window.addEventListener("storage", handleCartUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
      window.removeEventListener("storage", handleCartUpdated);
    };
  }, [fetchCartCount, user]);

  // Ekstrak nama kotanya saja dari data user yang login
  const userCity =
    extractCityOnly(
      user?.address ||
        user?.alamat ||
        user?.ktp_address ||
        user?.profile?.address ||
        user?.city ||
        user?.regency ||
        user?.location
    ) || "Madiun";

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (catNavRef.current && !catNavRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle pencarian produk
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      navigate(`/produk?search=${encodeURIComponent(query)}`);
    } else {
      navigate("/produk");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const res = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari akun Tandur?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#15803d",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
    });

    if (res.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setUser(null);
      setLiveCartCount(0);
      setUserDropdownOpen(false);
      Swal.fire({
        icon: "success",
        title: "Berhasil Keluar",
        text: "Anda telah keluar dari akun.",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      {/* Top promo bar */}
      <div className="bg-green-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[11px] sm:text-xs">
          <p className="truncate">
            Gratis Ongkir Pasar Raya Seluruh Jawa &amp; Bali dengan min. belanja Rp200.000
          </p>
          <ul className="hidden items-center gap-4 md:flex">
            {topLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="whitespace-nowrap hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-stone-200/70 bg-[#f6f1e7]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-6">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <a href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg">
              <img src="/favicon.svg" alt="logo" />
            </span>
            <span className="leading-none">
              <span className="block text-base font-extrabold tracking-tight text-green-800 sm:text-lg">
                TANDUR
              </span>
              <span className="block text-[9px] font-medium tracking-widest text-gray-500">
                AGRIBISNIS
              </span>
            </span>
          </a>

          {/* Location (statis, tanpa dropdown) */}
          <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left lg:flex">
            <MapPin size={18} className="text-green-700" />
            <span className="leading-tight">
              <span className="block text-[10px] text-gray-500">Kirim ke: Lokasi Akurat</span>
              <span className="block text-xs font-semibold text-gray-800">
                {userCity}
              </span>
            </span>
          </div>

          {/* Search (statis, tanpa dropdown) */}
          <form
            role="search"
            onSubmit={handleSearch}
            className="relative hidden h-10 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-green-700 focus-within:ring-2 focus-within:ring-green-700/20 md:flex"
          >
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari beras organik, sayur hidroponik, pupuk kompos..."
              className="h-full min-w-0 flex-1 px-3.5 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="flex h-full w-12 shrink-0 items-center justify-center bg-green-700 text-white hover:bg-green-800 transition"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            {/* Keranjang dengan badge real-time dari backend */}
            <Link
              to="/keranjang"
              aria-label="Keranjang"
              className="relative rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            >
              <ShoppingCart size={22} />
              {liveCartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {liveCartCount}
                </span>
              )}
            </Link>

            {/* Notifikasi */}
            <button
              type="button"
              aria-label="Notifikasi"
              onClick={() => {
                Swal.fire({
                  title: "Notifikasi",
                  text: "Belum ada notifikasi pesanan baru.",
                  icon: "info",
                  confirmButtonColor: "#15803d",
                });
              }}
              className="hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100 sm:block"
            >
              <Bell size={22} />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="Menu Akun"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-800 transition shadow-sm"
              >
                {user?.name ? (
                  <span className="text-xs font-bold uppercase">
                    {user.name.charAt(0)}
                  </span>
                ) : (
                  <User size={18} />
                )}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-xl z-50">
                  {user ? (
                    <>
                      <div className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 font-bold text-sm">
                            {user.name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {user.name || "Pengguna Tandur"}
                            </p>
                            <span className="inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 capitalize">
                              {user.role === "farmer"
                                ? "Mitra Petani"
                                : "Mitra Pembeli"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-1 text-sm">
                        {user.role === "farmer" && (
                          <Link
                            to="/farmer"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <LayoutDashboard size={16} /> Dashboard Petani
                          </Link>
                        )}
                        {user.role === "middleman" && (
                          <Link
                            to="/middleman"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <LayoutDashboard size={16} /> Dashboard Mitra
                          </Link>
                        )}
                        <Link
                          to={
                            user.role === "farmer"
                              ? "/farmer/profil"
                              : user.role === "middleman"
                              ? "/middleman/profil"
                              : "/akun"
                          }
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800"
                        >
                          <UserCheck size={16} /> Profil &amp; Akun
                        </Link>
                        <Link
                          to="/keranjang"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-800"
                        >
                          <ShoppingCart size={16} /> Keranjang Belanja ({liveCartCount})
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} /> Keluar (Logout)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3">
                      <p className="text-xs text-gray-500 mb-3 text-center">
                        Masuk untuk menikmati kemudahan belanja hasil panen segar.
                      </p>
                      <Link
                        to="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="mb-2 block w-full rounded-lg bg-green-700 py-2 text-center text-xs font-semibold text-white hover:bg-green-800"
                      >
                        Masuk ke Akun
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block w-full rounded-lg border border-gray-300 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Daftar Akun Baru
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search (mobile) */}
        <form
          role="search"
          onSubmit={handleSearch}
          className="px-4 pb-3 md:hidden"
        >
          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-gray-300 focus-within:border-green-700">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari beras organik, sayur, pupuk..."
              className="h-full min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="flex h-full w-11 items-center justify-center bg-green-700 text-white"
            >
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Category nav (desktop - SATU dropdown saja dengan ikon garis tiga di "Semua Kategori") */}
      <nav aria-label="Kategori" className="hidden border-b border-stone-200/70 bg-[#f6f1e7] md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4">
          <ul className="flex min-w-0 items-center gap-5 whitespace-nowrap text-sm lg:gap-7">
            {/* Satu-satunya Dropdown di Header Bawah dengan ikon garis tiga */}
            <li className="relative" ref={catNavRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-2 py-2.5 font-semibold text-gray-800 hover:text-green-700"
              >
                <Menu size={16} /> Semua Kategori
              </button>
              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-0.5 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                  <Link
                    to="/produk"
                    onClick={() => setCategoryDropdownOpen(false)}
                    className="block border-b border-gray-100 px-4 py-2 text-xs font-semibold text-green-800 hover:bg-green-50"
                  >
                    Semua Produk
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      to={c.href}
                      onClick={() => setCategoryDropdownOpen(false)}
                      className="block px-4 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>

            {/* Link Kategori Utama (tanpa dropdown) */}
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={c.href} className="block py-2.5 text-gray-600 hover:text-green-700">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-700 lg:flex">
            <ShieldCheck size={16} className="text-green-700" />
            Garansi Panen Segar 24 Jam
          </p>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav aria-label="Menu mobile" className="border-b border-gray-100 bg-white md:hidden">
          <ul className="mx-auto max-w-7xl divide-y divide-gray-100 px-4 text-sm">
            <li className="flex items-center gap-2 py-3 text-gray-700">
              <MapPin size={16} className="text-green-700" />
              Kirim ke: <b>{userCity}</b>
            </li>
            <li>
              <Link
                to="/produk"
                onClick={() => setMenuOpen(false)}
                className="block py-3 font-semibold text-green-800"
              >
                Semua Produk
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  to={c.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-gray-700 hover:text-green-700"
                >
                  {c.label}
                </Link>
              </li>
            ))}

            {topLinks.map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-gray-500"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1.5 py-3 text-xs text-gray-600">
              <ShieldCheck size={16} className="text-green-700" />
              Garansi Panen Segar 24 Jam
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}