import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "../features/authentication/login";
import Register from "../features/authentication/register";
import {
  DashboardLayout,
  middlemanMenu,
  farmerMenu, // Pastikan farmerMenu sudah di-export dari @/components/layout/dashboard/index
} from "@/components/layout/dashboard/index";
import Layout from "../components/layout/storeFront/Layout";

// Import halaman-halaman Petani
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

import {
  BuyerHomePage,
  ProductDetailPage,
  CartPage,
 
} from "../features/buyer";

// Wrapper agar tombol "Cari Pasokan Petani" di Beranda Tengkulak bisa berpindah halaman
function MiddlemanDashboardWrapper() {
  const navigate = useNavigate();
  return (
    <MiddlemanDashboardPage
      onNavigate={(route) => {
        if (route === "/cari-pasokan") {
          navigate("/middleman/cari-pasokan");
        } else {
          navigate(route);
        }
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Katalog / pembeli: header + footer */}
        <Route element={<Layout cartCount={3} />}>
          <Route path="/produk" element={<BuyerHomePage />} />
          <Route
            path="/produk/beras-pandan-wangi"
            element={<ProductDetailPage />}
          />
          <Route path="/keranjang" element={<CartPage />} />
        </Route>

        {/* Petani: header + sidebar dashboard, tanpa footer */}
        <Route
          path="/farmer"
          element={
            <DashboardLayout
              menu={farmerMenu}
              roleLabel="Mitra Petani"
              region="Demak"
              footerNote="Terverifikasi"
              user={{ name: "Pak Sugeng", subtitle: "Mitra Petani • Demak" }}
            />
          }
        >
          {/* Default /farmer langsung ke Beranda */}
          <Route index element={<FarmerDashboardPage />} />
          <Route path="jual-panen" element={<SellHarvestPage />} />
          <Route path="pesanan" element={<FarmerOrdersPage />} />
          <Route path="profil" element={<FarmerProfilePage />} />
          <Route path="verifikasi" element={<FarmerVerificationPage />} />
        </Route>

        {/* Tengkulak: header + sidebar dashboard, tanpa footer */}
        <Route
          path="/middleman"
          element={
            <DashboardLayout
              menu={middlemanMenu}
              roleLabel="Mitra Tengkulak"
              region="Demak"
              footerNote="Pasar Tani Terverifikasi"
              user={{ name: "Haji Supardi", subtitle: "Mitra Pembeli Demak" }}
            />
          }
        >
          {/* Default /middleman langsung ke Beranda Tengkulak */}
          <Route index element={<MiddlemanDashboardWrapper />} />
          <Route path="cari-pasokan" element={<FindFarmersPage />} />
          <Route path="inventaris" element={<InventoryListPage />} />
          <Route path="jual-stok" element={<SellStockPage />} />
          <Route path="penawaran" element={<PriceNegotiationPage />} />
          <Route path="transaksi" element={<MiddlemanTransactionPage />} />
        </Route>

        {/* Harus paling bawah */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}