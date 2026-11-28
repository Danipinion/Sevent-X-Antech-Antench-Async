import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Hourglass,
  ArrowLeft,
  Printer,
  ShoppingBag,
  Search,
  Building2,
  Sprout,
  XCircle,
  Scale,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { resolveMediaUrl } from '@/services/api';

export interface BuyerOrderItem {
  id: string;
  order_number: string;
  buyer_id?: string;
  buyer_name: string;
  buyer_phone?: string;
  buyer_segment?: 'b2c' | 'b2b';
  buyer_segment_label?: string;
  seller_id?: string;
  seller_name: string;
  seller_role?: 'middleman' | 'farmer';
  seller_role_label?: string;
  seller_location: string;
  items: {
    id?: string;
    product_id: string;
    product_name: string;
    category?: string;
    image_url?: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    subtotal: number;
  }[];
  total_amount: number;
  total_quantity: number;
  unit: string;
  payment_method: string;
  pickup_schedule: string;
  pickup_address: string;
  buyer_note?: string;
  status: 'pending' | 'scheduled' | 'ready_for_pickup' | 'completed' | 'cancelled';
  status_label: string;
  created_at: string;
  updated_at: string;
}

const BUYER_ORDERS_KEY = 'tandur_buyer_orders';
const MIDDLEMAN_ORDERS_KEY = 'tandur_middleman_buyer_orders';
const FARMER_ORDERS_KEY = 'tandur_farmer_incoming_orders';

export const BuyerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<BuyerOrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'ready' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = () => {
    setIsLoading(true);
    try {
      const raw = localStorage.getItem(BUYER_ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
          setIsLoading(false);
          return;
        }
      }
      setOrders([]);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const handleSync = () => loadOrders();
    window.addEventListener('ordersUpdated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ordersUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const formatRupiah = (num: number) => {
    return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Sinkronisasi status order ke semua storage (Buyer, Middleman, Farmer)
  const syncOrderStatus = (orderId: string, newStatus: BuyerOrderItem['status'], statusLabel: string) => {
    const updateList = (list: any[]) =>
      list.map((o) =>
        o.id === orderId || o.order_number === orderId
          ? { ...o, status: newStatus, status_label: statusLabel, updated_at: new Date().toISOString() }
          : o
      );

    try {
      const bList = JSON.parse(localStorage.getItem(BUYER_ORDERS_KEY) || '[]');
      localStorage.setItem(BUYER_ORDERS_KEY, JSON.stringify(updateList(bList)));
    } catch {}

    try {
      const mList = JSON.parse(localStorage.getItem(MIDDLEMAN_ORDERS_KEY) || '[]');
      localStorage.setItem(MIDDLEMAN_ORDERS_KEY, JSON.stringify(updateList(mList)));
    } catch {}

    try {
      const fList = JSON.parse(localStorage.getItem(FARMER_ORDERS_KEY) || '[]');
      localStorage.setItem(FARMER_ORDERS_KEY, JSON.stringify(updateList(fList)));
    } catch {}

    loadOrders();
    window.dispatchEvent(new Event('ordersUpdated'));
  };

  const handleConfirmReceived = async (order: BuyerOrderItem) => {
    const res = await Swal.fire({
      icon: 'question',
      title: 'Selesaikan Pesanan & Pembayaran?',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p>Pastikan Anda telah:</p>
          <ul style="margin: 8px 0 12px 18px; padding: 0;">
            <li>✓ Melakukan timbang ulang fisik di lokasi gudang/petani.</li>
            <li>✓ Menerima komoditas sesuai kualitas dan bobot pesanan.</li>
            <li>✓ Menyerahkan uang tunai <b>${formatRupiah(order.total_amount)}</b> kepada pihak penjual.</li>
          </ul>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#236B37',
      cancelButtonColor: '#7A827A',
      confirmButtonText: 'Ya, Selesaikan & Lunas',
      cancelButtonText: 'Batal',
    });

    if (!res.isConfirmed) return;

    syncOrderStatus(order.id, 'completed', 'Selesai & Lunas');

    await Swal.fire({
      icon: 'success',
      title: 'Pesanan Selesai!',
      text: 'Terima kasih telah berbelanja langsung dari rantai pasok agribisnis Tandur.',
      confirmButtonColor: '#236B37',
    });
  };

  const handleCancelOrder = async (order: BuyerOrderItem) => {
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Batalkan Pesanan Ini?',
      text: `Apakah Anda yakin ingin membatalkan pesanan ${order.order_number}?`,
      showCancelButton: true,
      confirmButtonColor: '#C93B2B',
      cancelButtonColor: '#7A827A',
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Kembali',
    });

    if (!res.isConfirmed) return;

    syncOrderStatus(order.id, 'cancelled', 'Dibatalkan');

    await Swal.fire({
      icon: 'info',
      title: 'Pesanan Dibatalkan',
      text: 'Pesanan telah dibatalkan dari antrean sistem.',
      confirmButtonColor: '#236B37',
    });
  };

  const handlePrintPO = (_order: BuyerOrderItem) => {
    window.print();
  };

  const handleViewTeraCertificate = (order: BuyerOrderItem) => {
    const qty = Number(order.total_quantity || 1000);
    const unitPrice = order.items?.[0]?.price_per_unit || Math.round(order.total_amount / (qty || 1));
    const totalAmount = order.total_amount || 0;
    const orderNum = order.order_number || order.id || '#TND-ORD';
    const taraKg = Math.round(qty * 0.01);
    const brutoKg = qty + taraKg;
    const isDirectFarmer = order.seller_role === 'farmer';

    Swal.fire({
      title: 'Surat Bukti Timbang Tera Sah',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; font-family: inherit;">
          <div style="background: #F4EFE6; padding: 12px 14px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #E6DFD2;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #156E33; margin: 0;">SERTIFIKASI METROLOGI LEGAL REPUBLIK INDONESIA</p>
                <p style="font-weight: 800; font-size: 14px; color: #1A201A; margin: 2px 0 0 0;">No. Tera: #TERA-TNDR-${String(orderNum).replace(/[^a-zA-Z0-9]/g, '').slice(-6) || '82910'}</p>
              </div>
              <span style="background: #E8F5EC; color: #156E33; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 6px;">SAH & TANGGUH</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Pihak Penjual:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1A201A;">${order.seller_name} ${isDirectFarmer ? '(Petani / Lumbung Panen)' : '(Mitra Gudang)'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Pihak Pembeli:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1A201A;">${order.buyer_name || 'Pembeli Bisnis (B2B)'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Komoditas:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1A201A;">${order.items?.[0]?.product_name || 'Komoditas Panen'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Bobot Kotor (Bruto):</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${brutoKg.toLocaleString('id-ID')} Kg</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Tara Kemasan Karung:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #9A4D16;">- ${taraKg.toLocaleString('id-ID')} Kg</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1; background: #FAF8F4;">
              <td style="padding: 8px 6px; font-weight: bold; color: #156E33;">Bobot Bersih (Netto Sah):</td>
              <td style="padding: 8px 6px; text-align: right; font-weight: 800; font-size: 14px; color: #156E33;">${qty.toLocaleString('id-ID')} ${order.unit || 'Kg'} (${(qty / 1000).toFixed(1)} Ton)</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Uji Kadar Air (KA):</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1A201A;">13.8% (Standar SNI Mutu I)</td>
            </tr>
            <tr style="border-bottom: 1px solid #F0EAE1;">
              <td style="padding: 6px 0; color: #7A827C;">Harga Satuan:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1A201A;">Rp ${unitPrice.toLocaleString('id-ID')} / ${order.unit || 'kg'}</td>
            </tr>
            <tr style="background: #E8F5EC;">
              <td style="padding: 8px 6px; font-weight: bold; color: #156E33;">Total Pelunasan Transaksi:</td>
              <td style="padding: 8px 6px; text-align: right; font-weight: 800; font-size: 15px; color: #156E33;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </table>

          <p style="font-size: 11px; color: #5C635E; margin: 0; text-align: center;">
            ✓ Sesuai ketentuan Undang-Undang Metrologi Legal No. 2 Tahun 1981 dan standar timbang digital terintegrasi Tandur.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cetak Lembar Tera Sah',
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#236B37',
      cancelButtonColor: '#7A827A',
    }).then((res) => {
      if (res.isConfirmed) {
        window.print();
      }
    });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'pending' && o.status !== 'pending') return false;
      if (activeTab === 'ready' && o.status !== 'ready_for_pickup') return false;
      if (activeTab === 'completed' && o.status !== 'completed') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchNum = o.order_number?.toLowerCase().includes(q);
      const matchSeller = o.seller_name?.toLowerCase().includes(q);
      const matchItem = o.items?.some((it) => it.product_name?.toLowerCase().includes(q));
      return matchNum || matchSeller || matchItem;
    });
  }, [orders, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      ready: orders.filter((o) => o.status === 'ready_for_pickup').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-[#1E241E] font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back link & Header */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#236B37] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Belanja Komoditas
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A201A]">
                Pesanan Saya
              </h1>
              <p className="text-xs sm:text-sm text-[#6D756D] mt-0.5">
                Pantau status konfirmasi, kesiapan muat di lokasi, dan riwayat transaksi komoditas Anda.
              </p>
            </div>

            <Link
              to="/"
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              Beli Komoditas Lagi
            </Link>
          </div>
        </div>

        {/* Tab Filter & Search */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[#236B37] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-[#6D756D] hover:bg-[#EAE2D3]'
                }`}
              >
                <span>Semua</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-[#E57A00] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-[#6D756D] hover:bg-[#EAE2D3]'
                }`}
              >
                <span>Menunggu Konfirmasi</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {counts.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                  activeTab === 'ready'
                    ? 'bg-[#15803d] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-[#6D756D] hover:bg-[#EAE2D3]'
                }`}
              >
                <span>Siap Diambil</span>
                {counts.ready > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {counts.ready}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-[#236B37] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-[#6D756D] hover:bg-[#EAE2D3]'
                }`}
              >
                <span>Selesai &amp; Lunas</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {counts.completed}
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#8A928A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. pesanan / komoditas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#DCD5C6] bg-[#FAF8F3] text-xs text-[#1A201A] focus:outline-none focus:border-[#236B37]"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 text-center text-xs text-[#6D756D]">
            Memuat daftar pesanan Anda...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EFE6] text-[#8A5A19] flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#1A201A]">
                Belum Ada Pesanan di Kategori Ini
              </h2>
              <p className="text-xs text-[#6D756D]">
                Semua pesanan yang Anda buat melalui keranjang belanja akan terlacak di halaman ini.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition"
            >
              Mulai Belanja Komoditas
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'pending';
              const isReady = order.status === 'ready_for_pickup';
              const isCompleted = order.status === 'completed';
              const isCancelled = order.status === 'cancelled';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden shadow-xs hover:border-[#D5CDBC] transition"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 bg-[#FAF8F3] border-b border-[#EFEAE0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-[#1A201A]">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-[#7A827A]">•</span>
                      <span className="text-xs text-[#7A827A] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(order.created_at)}
                      </span>
                      {order.buyer_segment === 'b2c' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3EB] text-[#C25E00] text-[10px] font-bold">
                          Konsumen Eceran (Kg)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#EEF2F6] text-[#334E68] text-[10px] font-bold">
                          Pengadaan Bisnis &amp; Grosir (Ton)
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#C25E00] text-xs font-bold">
                          <Hourglass className="w-3.5 h-3.5 animate-spin" />
                          {order.seller_role === 'farmer'
                            ? 'Menunggu Konfirmasi Petani'
                            : 'Menunggu Konfirmasi Penjual'}
                        </span>
                      )}
                      {order.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          Dikonfirmasi - Jadwal Timbang Lapangan
                        </span>
                      )}
                      {isReady && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-bold animate-pulse">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Siap Diambil di Lokasi
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F9F4] border border-[#D4E8D8] text-[#236B37] text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selesai &amp; Lunas
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          Dibatalkan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seller Info Banner */}
                  <div className="px-4 sm:px-5 py-3 border-b border-[#F4EFE6] flex items-center justify-between text-xs text-[#555D55]">
                    <div className="flex items-center gap-2">
                      {order.seller_role === 'farmer' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F5EC] text-[#156E33] text-[10px] font-bold border border-[#CDEBD4]">
                            <Sprout className="w-3.5 h-3.5 text-[#156E33]" />
                            Langsung dari Lumbung Petani (B2B)
                          </span>
                          <span>
                            Petani: <strong>{order.seller_name}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#8A5A19]" />
                          <span>
                            Penjual: <strong>{order.seller_name}</strong> ({order.seller_role_label || 'Mitra Tandur'})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#7A827A]">
                      <MapPin className="w-3.5 h-3.5 text-[#8A5A19]" />
                      <span>{order.seller_location}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 sm:p-5 space-y-3">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4EFE6] last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={resolveMediaUrl(item.image_url)}
                              alt={item.product_name}
                              className="w-14 h-14 rounded-xl object-cover border border-[#ECE6DA] shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-[#F4EFE6] flex items-center justify-center text-[#8A5A19] shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-[#1A201A]">
                              {item.product_name}
                            </h4>
                            <p className="text-xs text-[#6D756D] mt-0.5">
                              {item.quantity} {item.unit} × {formatRupiah(item.price_per_unit)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-[#7A827A] block sm:inline">Subtotal: </span>
                          <span className="text-sm font-bold text-[#1A201A]">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pickup & Payment Details Box */}
                  <div className="px-4 sm:px-5 py-3.5 bg-[#FBF9F5] border-t border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#7A827A] block">Jadwal Pengambilan</span>
                      <strong className="text-[#1A201A] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#236B37]" />
                        {order.pickup_schedule || 'Sesuai kesepakatan'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#7A827A] block">Lokasi Lumbung / Gudang</span>
                      <strong className="text-[#1A201A] flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#8A5A19] shrink-0" />
                        {order.pickup_address || order.seller_location}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#7A827A] block">Metode Bayar</span>
                      <strong className="text-[#236B37] mt-0.5 block">
                        {order.payment_method || 'Cash on Pickup'}
                      </strong>
                    </div>
                  </div>

                  {/* Card Footer: Total & Actions */}
                  <div className="p-4 sm:p-5 bg-white border-t border-[#EFEAE0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#6D756D]">Total Nilai Pesanan:</span>
                      <div className="text-lg sm:text-xl font-extrabold text-[#236B37]">
                        {formatRupiah(order.total_amount)}
                        <span className="text-xs font-normal text-[#6D756D] ml-1.5">
                          ({order.total_quantity} {order.unit})
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleConfirmReceived(order)}
                          className="px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Konfirmasi Terima &amp; Selesai
                        </button>
                      )}

                      {(isCompleted || isReady) && (
                        <button
                          type="button"
                          onClick={() => handleViewTeraCertificate(order)}
                          className="px-3.5 py-2 rounded-xl bg-[#E8F5EC] hover:bg-[#D5EEDC] text-[#156E33] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-[#C2E5CB]"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          Bukti Timbang Tera Sah
                        </button>
                      )}

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-[#E2DACB] hover:bg-[#FDF2F2] hover:border-red-300 text-red-600 text-xs font-semibold transition cursor-pointer"
                        >
                          Batalkan Pesanan
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePrintPO(order)}
                        className="px-3 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak Bukti PO
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerOrdersPage;
