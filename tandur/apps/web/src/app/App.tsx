import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
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
} from "../features/buyer";

// Helper untuk membaca user aktif yang sedang login dari storage
function getActiveUser(defaultRole: "farmer" | "middleman") {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const roleText =
        u.role === "farmer"
          ? "Mitra Petani"
          : u.role === "middleman"
          ? "Mitra Tengkulak"
          : "Mitra";
      const regionText = u.city || u.regency || "Demak";
      return {
        name: u.name || (defaultRole === "farmer" ? "Sugeng Santoso" : "Haji Supardi"),
        subtitle: `${roleText} • ${regionText}`,
        region: regionText,
      };
    }
  } catch {
    // fallback
  }
  return {
    name: defaultRole === "farmer" ? "Sugeng Santoso" : "Haji Supardi",
    subtitle: defaultRole === "farmer" ? "Mitra Petani • Demak" : "Mitra Pembeli Demak",
    region: "Demak",
  };
}

// Protected Route untuk membatasi akses URL berdasarkan peran akun
interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactElement;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!allowedRoles.includes(user.role)) {
      // Alihkan ke portal resmi milik akun pengguna tersebut
      if (user.role === "farmer") return <Navigate to="/farmer" replace />;
      if (user.role === "middleman") return <Navigate to="/middleman" replace />;
      if (user.role === "buyer") return <Navigate to="/produk" replace />;
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
      user={{ name: activeUser.name, subtitle: activeUser.subtitle }}
      profileTo="/farmer/profil"
    />
  );
}

function MiddlemanLayoutWrapper() {
  const activeUser = getActiveUser("middleman");
  return (
    <DashboardLayout
      menu={middlemanMenu}
      roleLabel="Mitra Tengkulak"
      region={activeUser.region}
      footerNote="Pasar Tani Terverifikasi"
      user={{ name: activeUser.name, subtitle: activeUser.subtitle }}
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

// Komponen penentu root route berdasarkan session/role login
function RootRedirect() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "farmer") return <Navigate to="/farmer" replace />;
      if (user.role === "middleman") return <Navigate to="/middleman" replace />;
      if (user.role === "buyer") return <Navigate to="/produk" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  // Tamu umum / unauthenticated diarahkan ke etalase produk pembeli
  return <Navigate to="/produk" replace />;
}

// Komponen pengarah link jual hasil panen
function JualRedirect() {
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "farmer") return <Navigate to="/farmer/jual-panen" replace />;
      if (user.role === "middleman") return <Navigate to="/middleman/jual-stok" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  return <Navigate to="/register?role=farmer" replace />;
}

// Komponen pengarah rute profil global (/profil, /profile, /akun)
function ProfileRedirect() {
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "middleman") return <Navigate to="/middleman/profil" replace />;
      if (user.role === "farmer") return <Navigate to="/farmer/profil" replace />;
      if (user.role === "buyer") return <Navigate to="/akun" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Awal / Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Otentikasi */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/register" element={<Navigate to="/register" replace />} />

        {/* Redirection link cepat dari header */}
        <Route path="/jual" element={<JualRedirect />} />

        {/* Katalog / Pembeli / Storefront: header + footer */}
        <Route element={<Layout cartCount={3} />}>
          <Route path="/produk" element={<BuyerHomePage />} />
          <Route path="/katalog" element={<Navigate to="/produk" replace />} />
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
          <Route path="hasil-panen" element={<Navigate to="/farmer/jual-panen" replace />} />
          <Route path="stok" element={<Navigate to="/farmer/jual-panen" replace />} />
          <Route path="transaksi" element={<Navigate to="/farmer/pesanan" replace />} />
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
          <Route path="beranda" element={<Navigate to="/middleman" replace />} />

          {/* Rute sesuai middlemanMenu */}
          <Route path="cari-pasokan" element={<FindFarmersPage />} />
          <Route path="inventaris" element={<InventoryListPage />} />
          <Route path="jual-stok" element={<SellStockPage />} />
          <Route path="penawaran" element={<PriceNegotiationPage />} />
          <Route path="transaksi" element={<MiddlemanTransactionPage />} />
          <Route path="profil" element={<FarmerProfilePage role="middleman" />} />

          {/* Alias backward-compatible */}
          <Route path="cari-petani" element={<Navigate to="/middleman/cari-pasokan" replace />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
