import {
  Binoculars,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
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

/* Menu Tengkulak (sesuai desain) */
export const middlemanMenu: MenuItem[] = [
  { label: "Beranda", to: "/middleman", icon: LayoutDashboard, end: true },
  { label: "Cari Petani & Pasokan", to: "/middleman/cari-petani", icon: Binoculars },
  { label: "Inventaris Stok Gudang", to: "/middleman/inventaris", icon: Warehouse },
  { label: "Penawaran & Kesepakatan", to: "/middleman/penawaran", icon: Tags },
  { label: "Transaksi & Pesanan", to: "/middleman/transaksi", icon: ReceiptText },
];

/* Menu Petani (contoh, sesuaikan dengan desain halaman petani) */
export const farmerMenu: MenuItem[] = [
  { label: "Beranda", to: "/farmer", icon: LayoutDashboard, end: true },
  { label: "Verifikasi Petani", to: "/farmer/verifikasi", icon: ShieldCheck },
  { label: "Hasil Panen", to: "/farmer/hasil-panen", icon: Sprout },
  { label: "Stok & Pengiriman", to: "/farmer/stok", icon: Package },
  { label: "Transaksi & Pesanan", to: "/farmer/transaksi", icon: ReceiptText },
];