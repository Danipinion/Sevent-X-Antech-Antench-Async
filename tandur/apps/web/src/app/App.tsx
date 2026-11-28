import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import TandurSplashScreen from "../components/splash";
import Login from "../features/authentication/login";
import Register from "../features/authentication/register";
import {
  DashboardLayout,
  farmerMenu,
  middlemanMenu,
} from "@/components/layout/dashboard/index";
import Layout from "../components/layout/storeFront/Layout";

// Import halaman-halaman Petani (Farmer)
import FarmerDashboardPage from "../features/farmer/dashboard";
import SellHarvestPage from "../features/farmer/sellHervest";
import FarmerOrdersPage from "../features/orders/farmerOrders";
import FarmerProfilePage from "../features/profile/farmerProfile";
import FarmerVerificationPage from "../features/farmer/verification";

// Import halaman-halaman Tengkulak (Middleman)
import {
  DashboardPage as MiddlemanDashboardPage,
  FindFarmersPage,
  PriceNegotiationPage,
} from "../features/middleman";
import { InventoryListPage, SellStockPage } from "../features/inventory";
import { MiddlemanTransactionPage } from "../features/orders";

// Import halaman-halaman Pembeli (Storefront / Buyer)
import {
  BuyerHomePage,
  ProductDetailPage,
  CartPage,
  BuyerOrdersPage,
} from "../features/buyer";
import { getEffectiveCartCount } from "@/services/api";

// Helper untuk mengambil nama kotanya saja dari string address (tanpa jalan, provinsi, maupun awalan Kota/Kab)
function extractCityOnly(address?: string): string | null {
  if (!address || !address.trim()) return null;

  // 1. Jika ada pola eksplisit "Kota Madiun" atau "Kabupaten/Kab. Madiun", ambil nama kotanya saja ("Madiun")
  const explicitMatch = address.match(
    /\b(?:Kota|Kabupaten|Kab\.?)\s+([A-Za-z\s]+?)(?:,|$)/i
  );
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].trim();
  }

  // 2. Jika format dipisah koma (misal: "Jl. Pahlawan No. 12, Madiun, Jawa Timur" atau "Madiun, Jawa Timur")
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let candidate = "";
  if (parts.length >= 3) {
    // Bagian sebelum provinsi biasanya adalah kota/kabupaten
    candidate = parts[parts.length - 2];
  } else if (parts.length === 2) {
    // Jika 2 bagian ("Madiun, Jawa Timur" atau "Jl. Melati, Madiun")
    const isFirstStreet =
      /^(?:jl\.?|jalan|dsn\.?|dusun|ds\.?|desa|kec\.?|kecamatan|rt|rw)\b/i.test(
        parts[0]
      );
    candidate = isFirstStreet ? parts[1] : parts[0];
  } else {
    candidate = parts[0];
  }

  // Bersihkan awalan "Kota", "Kabupaten", "Kab.", dan kode pos jika ada
  const cleaned = candidate
    .replace(/^(?:Kota|Kabupaten|Kab\.?)\s+/i, "")
    .replace(/\b\d{5}\b/g, "")
    .trim();

  return cleaned || null;
}

// Helper untuk membaca user aktif yang sedang login dari storage
function getActiveUser(defaultRole: "farmer" | "middleman") {
  const defaultCity = "Madiun";

  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const roleText =
        u.role === "farmer"
          ? "Mitra Petani"
          : u.role === "middleman"
          ? "Mitra Pembeli"
          : "Mitra";

      // Ambil nama kotanya saja dari address
      const cityText =
        extractCityOnly(u.address) ||
        extractCityOnly(u.ktp_address) ||
        extractCityOnly(u.city) ||
        extractCityOnly(u.regency) ||
        extractCityOnly(u.location) ||
        defaultCity;

      return {
        name:
          u.name ||
          (defaultRole === "farmer" ? "Sugeng Santoso" : "Haji Supardi"),
        subtitle: `${roleText} • ${cityText}`,
        location: cityText,
        region: cityText,
      };
    }
  } catch {
    // fallback
  }

  return {
    name: defaultRole === "farmer" ? "Sugeng Santoso" : "Haji Supardi",
    subtitle:
      defaultRole === "farmer"
        ? `Mitra Petani • ${defaultCity}`
        : `Mitra Pembeli • ${defaultCity}`,
    location: defaultCity,
    region: defaultCity,
  };
}

// Protected Route untuk membatasi akses URL berdasarkan peran akun
interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactElement;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const userStr =
    localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!allowedRoles.includes(user.role)) {
      if (user.role === "farmer") return <Navigate to="/farmer" replace />;
      if (user.role === "middleman")
        return <Navigate to="/middleman" replace />;
      if (user.role === "buyer") return <Navigate to="/" replace />;
      return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function FarmerLayoutWrapper() {
  const activeUser = getActiveUser("farmer");
  return (
    <DashboardLayout
      menu={farmerMenu}
      roleLabel="Mitra Petani"
      region={activeUser.region}
      footerNote="Terverifikasi"
      user={{
        name: activeUser.name,
        subtitle: activeUser.subtitle,
        location: activeUser.location,
      }}
      profileTo="/farmer/profil"
    />
  );
}

function MiddlemanLayoutWrapper() {
  const activeUser = getActiveUser("middleman");
  return (
    <DashboardLayout
      menu={middlemanMenu}
      roleLabel="Mitra Pembeli"
      region={activeUser.region}
      footerNote="Pasar Tani Terverifikasi"
      user={{
        name: activeUser.name,
        subtitle: activeUser.subtitle,
        location: activeUser.location,
      }}
      profileTo="/middleman/profil"
    />
  );
}

// Wrapper agar navigasi internal di Beranda Petani berjalan lancar
function FarmerDashboardWrapper() {
  const navigate = useNavigate();
  return (
    <FarmerDashboardPage
      onNavigate={(route) => {
        navigate(route);
      }}
    />
  );
}

// Wrapper agar tombol "Cari Pasokan Petani" di Beranda Tengkulak berpindah halaman
function MiddlemanDashboardWrapper() {
  const navigate = useNavigate();
  return (
    <MiddlemanDashboardPage
      onNavigate={(route) => {
        if (route === "/cari-pasokan" || route === "cari-pasokan") {
          navigate("/middleman/cari-pasokan");
        } else {
          navigate(route);
        }
      }}
    />
  );
}


// Komponen pengarah link jual hasil panen
function JualRedirect() {
  const userStr =
    localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "farmer")
        return <Navigate to="/farmer/jual-panen" replace />;
      if (user.role === "middleman")
        return <Navigate to="/middleman/jual-stok" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  return <Navigate to="/register?role=farmer" replace />;
}

// Komponen pengarah rute profil global (/profil, /profile, /akun)
function ProfileRedirect() {
  const userStr =
    localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "middleman")
        return <Navigate to="/middleman/profil" replace />;
      if (user.role === "farmer")
        return <Navigate to="/farmer/profil" replace />;
      if (user.role === "buyer") return <Navigate to="/akun" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [cartCount, setCartCount] = useState<number>(0);

  // Ambil jumlah item keranjang terpadu
  const fetchUserCartCount = useCallback(async () => {
    try {
      const count = await getEffectiveCartCount();
      setCartCount(count);
    } catch {
      try {
        const rawLocal = localStorage.getItem("tandur_buyer_cart");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            setCartCount(parsed.length);
          }
        }
      } catch {
        setCartCount(0);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserCartCount();

    const syncCart = () => fetchUserCartCount();
    window.addEventListener("cartUpdated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cartUpdated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [fetchUserCartCount]);

  if (showSplash) {
    return (
      <TandurSplashScreen
        duration={3000}
        onComplete={() => setShowSplash(false)}
        backgroundImageUrl="/tandur-bg.jpg"
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Otentikasi */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/auth/register"
          element={<Navigate to="/register" replace />}
        />

        {/* Redirection link cepat dari header */}
        <Route path="/jual" element={<JualRedirect />} />

        {/* Katalog / Pembeli / Storefront: header + footer */}
        <Route element={<Layout cartCount={cartCount} />}>
          {/* Halaman Utama / Etalase Produk langsung di root URL / */}
          <Route path="/" element={<BuyerHomePage />} />
          <Route path="/produk" element={<Navigate to="/" replace />} />
          <Route path="/katalog" element={<Navigate to="/" replace />} />
          <Route path="/kategori/:category" element={<BuyerHomePage />} />
          <Route path="/kategori" element={<BuyerHomePage />} />
          <Route path="/promo" element={<BuyerHomePage />} />
          <Route path="/mitra-tani" element={<BuyerHomePage />} />
          <Route path="/aplikasi" element={<BuyerHomePage />} />
          <Route path="/notifikasi" element={<BuyerHomePage />} />
          <Route path="/akun" element={<FarmerProfilePage role="buyer" />} />
          <Route path="/profil" element={<ProfileRedirect />} />
          <Route path="/profile" element={<ProfileRedirect />} />
          <Route
            path="/produk/beras-pandan-wangi"
            element={<ProductDetailPage />}
          />
          <Route path="/produk/:id" element={<ProductDetailPage />} />
          <Route path="/keranjang" element={<CartPage />} />
          <Route
            path="/pesanan-saya"
            element={
              <ProtectedRoute allowedRoles={["buyer", "middleman", "farmer"]}>
                <BuyerOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pesanan"
            element={
              <ProtectedRoute allowedRoles={["buyer", "middleman", "farmer"]}>
                <BuyerOrdersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Mitra Petani: header + sidebar dashboard (farmerMenu) */}
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerLayoutWrapper />
            </ProtectedRoute>
          }
        >
          {/* Default /farmer langsung ke Beranda */}
          <Route index element={<FarmerDashboardWrapper />} />
          <Route path="beranda" element={<Navigate to="/farmer" replace />} />

          {/* Rute sesuai farmerMenu */}
          <Route path="jual-panen" element={<SellHarvestPage />} />
          <Route path="pesanan" element={<FarmerOrdersPage />} />
          <Route path="verifikasi" element={<FarmerVerificationPage />} />
          <Route path="profil" element={<FarmerProfilePage role="farmer" />} />

          {/* Alias backward-compatible */}
          <Route
            path="hasil-panen"
            element={<Navigate to="/farmer/jual-panen" replace />}
          />
          <Route
            path="stok"
            element={<Navigate to="/farmer/jual-panen" replace />}
          />
          <Route
            path="transaksi"
            element={<Navigate to="/farmer/pesanan" replace />}
          />
        </Route>

        {/* Mitra Tengkulak: header + sidebar dashboard (middlemanMenu) */}
        <Route
          path="/middleman"
          element={
            <ProtectedRoute allowedRoles={["middleman"]}>
              <MiddlemanLayoutWrapper />
            </ProtectedRoute>
          }
        >
          {/* Default /middleman langsung ke Beranda Tengkulak */}
          <Route index element={<MiddlemanDashboardWrapper />} />
          <Route
            path="beranda"
            element={<Navigate to="/middleman" replace />}
          />

          {/* Rute sesuai middlemanMenu */}
          <Route path="cari-pasokan" element={<FindFarmersPage />} />
          <Route path="inventaris" element={<InventoryListPage />} />
          <Route path="jual-stok" element={<SellStockPage />} />
          <Route path="penawaran" element={<PriceNegotiationPage />} />
          <Route path="transaksi" element={<MiddlemanTransactionPage />} />
          <Route
            path="profil"
            element={<FarmerProfilePage role="middleman" />}
          />

          {/* Alias backward-compatible */}
          <Route
            path="cari-petani"
            element={<Navigate to="/middleman/cari-pasokan" replace />}
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}