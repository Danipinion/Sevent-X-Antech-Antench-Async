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
  return <Navigate to="/login" replace />;
}

// Komponen pengarah rute profil global (/profil, /profile, /akun)
function ProfileRedirect() {
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "middleman") return <Navigate to="/middleman/profil" replace />;
      if (user.role === "farmer") return <Navigate to="/farmer/profil" replace />;
    } catch {
      // ignore JSON parse error
    }
  }
  return <Navigate to="/farmer/profil" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Awal / Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Rute Profil Global */}
        <Route path="/profil" element={<ProfileRedirect />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/akun" element={<ProfileRedirect />} />

        {/* Otentikasi */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/register" element={<Navigate to="/register" replace />} />

        {/* Katalog / Pembeli / Storefront: header + footer */}
        <Route element={<Layout cartCount={3} />}>
          <Route path="/produk" element={<BuyerHomePage />} />
          <Route path="/katalog" element={<Navigate to="/produk" replace />} />
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
            <DashboardLayout
              menu={farmerMenu}
              roleLabel="Mitra Petani"
              region="Demak"
              footerNote="Terverifikasi"
              user={{ name: "Pak Sugeng", subtitle: "Mitra Petani • Demak" }}
              profileTo="/farmer/profil"
            />
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
            <DashboardLayout
              menu={middlemanMenu}
              roleLabel="Mitra Tengkulak"
              region="Demak"
              footerNote="Pasar Tani Terverifikasi"
              user={{ name: "Haji Supardi", subtitle: "Mitra Pembeli Demak" }}
              profileTo="/middleman/profil"
            />
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
