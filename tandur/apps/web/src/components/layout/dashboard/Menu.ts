import {
  Binoculars,
  CircleUserRound,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Tags,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** true = menu aktif hanya jika path sama persis (untuk halaman Beranda) */
  end?: boolean;
}

/* =========================================================================
   Menu Mitra Petani (Farmer)
   ========================================================================= */
export const farmerMenu: MenuItem[] = [
  { label: "Beranda", to: "/farmer", icon: LayoutDashboard, end: true },
  { label: "Jual Hasil Panen", to: "/farmer/jual-panen", icon: Sprout },
  { label: "Pesanan & Transaksi", to: "/farmer/pesanan", icon: ReceiptText },
  { label: "Verifikasi Petani", to: "/farmer/verifikasi", icon: ShieldCheck },
  { label: "Profil Akun", to: "/farmer/profil", icon: CircleUserRound },
];

/* =========================================================================
   Menu Mitra Tengkulak (Middleman)
   ========================================================================= */
export const middlemanMenu: MenuItem[] = [
  { label: "Beranda", to: "/middleman", icon: LayoutDashboard, end: true },
  { label: "Cari Petani & Pasokan", to: "/middleman/cari-pasokan", icon: Binoculars },
  { label: "Inventaris Stok Gudang", to: "/middleman/inventaris", icon: Warehouse },
  { label: "Jual Stok Komoditas", to: "/middleman/jual-stok", icon: Package },
  { label: "Penawaran & Kesepakatan", to: "/middleman/penawaran", icon: Tags },
  { label: "Transaksi & Pesanan", to: "/middleman/transaksi", icon: ReceiptText },
  { label: "Profil Akun", to: "/middleman/profil", icon: CircleUserRound },
];

/* =========================================================================
   Menu Pembeli / Katalog Storefront (Buyer)
   ========================================================================= */
export const buyerMenu: MenuItem[] = [
  { label: "Katalog Belanja", to: "/produk", icon: Sprout },
  { label: "Keranjang Belanja", to: "/keranjang", icon: ShoppingCart },
];
