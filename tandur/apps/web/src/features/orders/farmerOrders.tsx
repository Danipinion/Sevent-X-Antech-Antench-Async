import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Wheat,
  Wallet,
  Search,
  Calendar,
  ArrowUpDown,
  MessageSquare,
  Clock,
  ShieldCheck,
  Package,
  Plus,
  Loader2,
  Image as ImageIcon,
  XCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchApi, FarmerApi, type FarmerPurchaseOrder } from '@/services/api';

type OrderTab = 'all' | 'listings' | 'pending' | 'scheduled' | 'completed' | 'cancelled';

interface HarvestListing {
  id: string;
  commodity_id?: string;
  commodity_name?: string;
  title?: string;
  description?: string;
  estimated_quantity?: number;
  unit?: string;
  price_per_unit?: number;
  ready_date?: string;
  pickup_address?: string;
  media_urls?: string[];
  status?: string;
  created_at?: string;
}

type FarmerOrder = FarmerPurchaseOrder & {
  order_code?: string;
  listing_id?: string;
  status_label?: string;
  quantity?: number;
  agreed_price?: number;
  offered_quantity?: number;
  offered_price?: number;
  total_offered_price?: number;
  total_price?: number;
  total_amount?: number;
  unit?: string;
  pickup_date?: string;
  ready_date?: string;
  pickup_time_slot?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  driver_name?: string;
  pickup_address?: string;
  is_ready_for_pickup?: boolean;
  counter_price?: number;
  counter_quantity?: number;
  counter_notes?: string;
};

type FarmerOrdersResponse = {
  status?: string;
  message?: string;
  data: FarmerOrder[];
  meta?: { summary?: { waiting_confirmation_count?: number } };
};

const isWaitingConfirmation = (status?: string) =>
  status === 'waiting_confirmation' || status === 'pending' || status === 'in_negotiation';

const isScheduledOrder = (status?: string) =>
  status === 'scheduled_pickup' || status === 'scheduled' || status === 'in_transit';

export default function FarmerOrdersPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortNewest, setSortNewest] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [listings, setListings] = useState<HarvestListing[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAllData() {
      setIsLoading(true);
      try {
        const [ordersRes, listingsRes] = await Promise.allSettled([
          fetchApi<FarmerOrdersResponse>('/farmer/orders'),
          fetchApi<{ data?: HarvestListing[] } | HarvestListing[]>('/listings'),
        ]);

        if (!isMounted) return;

        // Parse orders
        if (ordersRes.status === 'fulfilled') {
          const rawOrders = ordersRes.value;
          const orderList = Array.isArray((rawOrders as any)?.data)
            ? (rawOrders as any).data
            : Array.isArray(rawOrders)
            ? rawOrders
            : [];
          setOrders(orderList as FarmerOrder[]);
          setOrdersError(null);
        } else {
          setOrders([]);
          setOrdersError('Pesanan gagal dimuat. Silakan muat ulang halaman.');
        }

        // Parse listings (produk panen yang sudah ditambahkan petani)
        if (listingsRes.status === 'fulfilled') {
          const rawListings = listingsRes.value;
          const listingList = Array.isArray((rawListings as any)?.data)
            ? (rawListings as any).data
            : Array.isArray(rawListings)
            ? rawListings
            : [];
          setListings(listingList);
        } else {
          // Fallback endpoint jika endpoint backend menggunakan /farmer/listings
          try {
            const altRes = await fetchApi<{ data?: HarvestListing[] } | HarvestListing[]>(
              '/farmer/listings'
            );
            if (isMounted) {
              const altList = Array.isArray((altRes as any)?.data)
                ? (altRes as any).data
                : Array.isArray(altRes)
                ? altRes
                : [];
              setListings(altList);
            }
          } catch {
            // Biarkan kosong jika tidak ada
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Terima Penawaran & Jadwalkan Penjemputan (POST /farmer/orders/{id}/accept)
  const handleAcceptOffer = async (orderId: string) => {
    try {
      const res = await FarmerApi.acceptOrder(orderId);
      const updatedOrder = (res as any)?.data || res;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'scheduled_pickup',
                status_label: 'Armada Menuju Lokasi',
                ...(updatedOrder || {}),
              }
            : o
        )
      );

      await Swal.fire({
        icon: 'success',
        title: 'Penawaran Diterima & Dijadwalkan',
        text: 'Penawaran pembeli berhasil diterima dan jadwal penjemputan armada dikonfirmasi.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Menerima Penawaran',
        text: err?.message || 'Terjadi kesalahan saat memproses penerimaan pesanan.',
        confirmButtonColor: '#156E33',
      });
    }
  };

  // 2. Negosiasi Harga Penawaran (POST /farmer/orders/{id}/negotiate)
  const handleNegotiateOffer = async (order: FarmerOrder) => {
    const currentPrice = Number(order.offered_price || order.agreed_price || 0);
    const currentQty = Number(order.offered_quantity || order.quantity || 1000);

    const { value: formValues } = await Swal.fire({
      title: 'Negosiasi Harga Penawaran',
      html: `
        <div style="text-align: left; font-size: 13px; font-family: inherit;">
          <p style="margin-bottom: 8px; color: #5C635E;">Harga tawaran saat ini: <b>Rp ${currentPrice.toLocaleString('id-ID')} / ${order.unit || 'kg'}</b></p>
          <label style="display:block; font-weight: 600; margin-bottom: 4px;">Harga Tandingan Petani (Rp / ${order.unit || 'kg'}):</label>
          <input id="swal-counter-price" type="number" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${currentPrice + 200}" min="100" step="50" required>
          
          <label style="display:block; font-weight: 600; margin-bottom: 4px;">Kuantitas yang Disetujui (kg):</label>
          <input id="swal-counter-qty" type="number" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${currentQty}" min="500" step="100">
          
          <label style="display:block; font-weight: 600; margin-bottom: 4px;">Catatan Tambahan untuk Pembeli (opsional):</label>
          <input id="swal-counter-notes" type="text" class="swal2-input" style="width: 100%; margin: 0;" placeholder="Contoh: Kadar air rendah, mutu super">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Kirim Negosiasi',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#156E33',
      preConfirm: () => {
        const price = Number((document.getElementById('swal-counter-price') as HTMLInputElement)?.value);
        const qty = Number((document.getElementById('swal-counter-qty') as HTMLInputElement)?.value);
        const notes = (document.getElementById('swal-counter-notes') as HTMLInputElement)?.value || '';

        if (!price || price <= 0) {
          Swal.showValidationMessage('Harga tandingan harus diisi dan lebih dari 0');
          return false;
        }
        return { price, qty: qty > 0 ? qty : undefined, notes };
      },
    });

    if (formValues) {
      try {
        const res = await FarmerApi.negotiateOrder(order.id, {
          counter_price: formValues.price,
          counter_quantity: formValues.qty,
          counter_notes: formValues.notes,
        });
        const updatedOrder = (res as any)?.data || res;

        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: 'in_negotiation',
                  status_label: 'Dalam Negosiasi',
                  counter_price: formValues.price,
                  ...(updatedOrder || {}),
                }
              : o
          )
        );

        await Swal.fire({
          icon: 'success',
          title: 'Negosiasi Terkirim',
          text: `Harga tandingan Rp ${formValues.price.toLocaleString('id-ID')} telah diajukan ke pembeli.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err: any) {
        await Swal.fire({
          icon: 'error',
          title: 'Gagal Mengirim Negosiasi',
          text: err?.message || 'Terjadi kesalahan saat mengirim harga negosiasi.',
          confirmButtonColor: '#156E33',
        });
      }
    }
  };

  // 3. Tolak Penawaran Tengkulak (POST /farmer/orders/{id}/reject)
  const handleRejectOffer = async (orderId: string) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: 'Tolak Penawaran Pembeli?',
      text: 'Pesanan penawaran ini akan dibatalkan.',
      input: 'text',
      inputPlaceholder: 'Tulis alasan penolakan (opsional)...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Tolak',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#DC2626',
    });

    if (isConfirmed) {
      try {
        const res = await FarmerApi.rejectOrder(orderId, reason || '');
        const updatedOrder = (res as any)?.data || res;

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'cancelled',
                  status_label: 'Dibatalkan',
                  ...(updatedOrder || {}),
                }
              : o
          )
        );

        await Swal.fire({
          icon: 'success',
          title: 'Penawaran Ditolak',
          text: 'Penawaran telah dibatalkan dari antrean pesanan Anda.',
          timer: 1800,
          showConfirmButton: false,
        });
      } catch (err: any) {
        await Swal.fire({
          icon: 'error',
          title: 'Gagal Menolak Penawaran',
          text: err?.message || 'Terjadi kesalahan saat menghubungi server.',
          confirmButtonColor: '#156E33',
        });
      }
    }
  };

  // 4. Konfirmasi Siap Muat (POST /farmer/orders/{id}/confirm-ready)
  const handleConfirmReady = async (orderId: string) => {
    try {
      const res = await FarmerApi.confirmReady(orderId);
      const updatedOrder = (res as any)?.data || res;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                is_ready_for_pickup: true,
                status: 'scheduled_pickup',
                ...(updatedOrder || {}),
              }
            : o
        )
      );

      await Swal.fire({
        icon: 'success',
        title: 'Lumbung Siap Muat Dikonfirmasi',
        text: 'Armada pembeli telah diberitahu bahwa muatan hasil panen sudah siap ditimbang dan dimuat.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Konfirmasi Siap Muat',
        text: err?.message || 'Terjadi kesalahan saat konfirmasi muat ke server.',
        confirmButtonColor: '#156E33',
      });
    }
  };

  const handleShareLocation = async (order: FarmerOrder) => {
    const address = order.pickup_address || 'Lokasi lumbung sesuai profil petani';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(address);
      }
    } catch {
      // Abaikan jika clipboard API tidak diizinkan
    }

    await Swal.fire({
      icon: 'info',
      title: 'Titik Jemput Muatan Panen',
      html: `
        <div style="text-align: left; font-size: 13px; font-family: inherit;">
          <p style="margin-bottom: 6px; color: #5C635E;">Alamat penjemputan armada:</p>
          <div style="padding: 10px; background: #F5F2EB; border-radius: 8px; font-weight: 600; color: #1C241E; word-break: break-word; line-height: 1.5;">
            ${address}
          </div>
          <p style="margin-top: 10px; font-size: 11px; color: #156E33; font-weight: 600;">
            ✓ Alamat penjemputan berhasil disalin ke clipboard untuk diteruskan ke sopir armada.
          </p>
        </div>
      `,
      confirmButtonColor: '#156E33',
    });
  };


  // Hitung statistik dinamis dari data nyata
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed'),
    [orders]
  );

  const pendingOrders = useMemo(
    () => orders.filter((o) => isWaitingConfirmation(o.status)),
    [orders]
  );

  const scheduledOrders = useMemo(
    () => orders.filter((o) => isScheduledOrder(o.status)),
    [orders]
  );

  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === 'cancelled'),
    [orders]
  );

  const totalRevenue = useMemo(() => {
    return completedOrders.reduce((acc, item: any) => {
      const val = Number(item.total_price || item.total_amount || 0);
      return acc + val;
    }, 0);
  }, [completedOrders]);

  // Jadwal penjemputan terdekat dari order yang scheduled/in_transit
  const upcomingPickup = scheduledOrders[0] as any;

  // Filter & Pencarian untuk Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order: any) => {
        if (activeTab === 'listings') return false;
        if (activeTab === 'pending' && !isWaitingConfirmation(order.status)) return false;
        if (
          activeTab === 'scheduled' &&
          !isScheduledOrder(order.status)
        )
          return false;
        if (activeTab === 'completed' && order.status !== 'completed') return false;
        if (activeTab === 'cancelled' && order.status !== 'cancelled') return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          String(order.id || '').toLowerCase().includes(q) ||
          String(order.order_code || '').toLowerCase().includes(q) ||
          String(order.buyer_name || '').toLowerCase().includes(q) ||
          String(order.commodity_name || '').toLowerCase().includes(q)
        );
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortNewest ? timeB - timeA : timeA - timeB;
      });
  }, [orders, activeTab, searchQuery, sortNewest]);

  // Filter & Pencarian untuk Produk/Panen yang sudah ditambahkan
  const filteredListings = useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'listings') return [];
    return listings
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          String(item.title || '').toLowerCase().includes(q) ||
          String(item.commodity_name || '').toLowerCase().includes(q) ||
          String(item.pickup_address || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.ready_date || 0).getTime();
        const timeB = new Date(b.created_at || b.ready_date || 0).getTime();
        return sortNewest ? timeB - timeA : timeA - timeB;
      });
  }, [listings, activeTab, searchQuery, sortNewest]);

  const incomingOffersByListing = useMemo(() => {
    const counts = new Map<string, number>();
    orders.filter((o) => isWaitingConfirmation(o.status)).forEach((o) => {
      if (o.listing_id) counts.set(o.listing_id, (counts.get(o.listing_id) || 0) + 1);
    });
    return counts;
  }, [orders]);

  const tabs: { id: OrderTab; label: string; count: number }[] = [
    { id: 'all', label: 'Semua Aktivitas', count: orders.length + listings.length },
    { id: 'listings', label: 'Panen Dipublikasikan', count: listings.length },
    { id: 'pending', label: 'Menunggu Konfirmasi', count: pendingOrders.length },
    { id: 'scheduled', label: 'Dijadwalkan Dijemput', count: scheduledOrders.length },
    { id: 'completed', label: 'Selesai & Lunas', count: completedOrders.length },
    { id: 'cancelled', label: 'Dibatalkan', count: cancelledOrders.length },
  ];

  const currentMonthLabel = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Schedule Banner Alert (Hanya tampil jika ada jadwal penjemputan aktif) */}
        {upcomingPickup && (
          <div className="rounded-2xl border border-[#EFECE6] bg-[#F7F4EC] p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-[#1C241E]">
                    Jadwal Timbang &amp; Muat Terdekat
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[#FADEC9] text-[#9A4D16] text-[11px] font-bold">
                    {upcomingPickup.status === 'in_transit' ? 'Armada Menuju Lokasi' : 'Terjadwal'}
                  </span>
                </div>
                <p className="text-xs text-[#5C635E] mt-0.5">
                  Armada pembeli <strong>{upcomingPickup.buyer_name || 'Mitra Pembeli'}</strong>{' '}
                  dijadwalkan menjemput komoditas{' '}
                  <strong>{upcomingPickup.commodity_name || 'Hasil Panen'}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleShareLocation(upcomingPickup)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E2DA] hover:bg-[#FAF8F4] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#156E33]" />
                Bagikan Titik Jemput
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReady(upcomingPickup.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  upcomingPickup.is_ready_for_pickup
                    ? 'bg-[#E8F5EC] text-[#156E33] border border-[#CDEBD4]'
                    : 'bg-[#156E33] hover:bg-[#105728] text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {upcomingPickup.is_ready_for_pickup ? 'Lumbung Siap Muat' : 'Konfirmasi Siap Muat'}
              </button>
            </div>
          </div>
        )}

        {/* Page Header + Metric Summary Cards */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#156E33]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#156E33]">
                MANAJEMEN TRANSAKSI &amp; STOK PANEN
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
              Daftar Pesanan &amp; Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-[#5C635E] leading-relaxed">
              Kelola produk hasil panen yang Anda publikasikan, pantau penawaran tengkulak yang
              masuk, serta status timbang dan transfer dana ke rekening Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white rounded-2xl border border-[#EFECE6] px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A827C]">Total Pendapatan Lunas</p>
                <p className="text-sm sm:text-base font-bold text-[#1C241E]">
                  Rp {formatRupiah(totalRevenue)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFECE6] px-4 py-3 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#7A827C]">Panen Aktif</p>
                <p className="text-sm sm:text-base font-bold text-[#1C241E]">
                  {listings.length} <span className="text-xs font-medium text-[#7A827C]">Produk</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/farmer/jual-panen')}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Jual Panen Baru
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#156E33] text-white shadow-2xs'
                    : 'bg-white border border-[#EFECE6] text-[#5C635E] hover:bg-[#F7F4EC]'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'pending' || tab.id === 'scheduled'
                      ? 'bg-[#FADEC9] text-[#9A4D16]'
                      : tab.id === 'completed' || tab.id === 'listings'
                      ? 'bg-[#E8F5EC] text-[#156E33]'
                      : 'bg-[#F2EFE9] text-[#7A827C]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl border border-[#EFECE6] p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9AA19C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor transaksi, komoditas, varietas, atau lokasi..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F6F1] text-xs sm:text-sm text-[#1C241E] placeholder:text-[#9AA19C] outline-none focus:ring-1 focus:ring-[#156E33]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F6F1] text-xs font-semibold text-[#1C241E]">
              <Calendar className="w-3.5 h-3.5 text-[#5C635E]" />
              {currentMonthLabel}
            </div>
            <button
              type="button"
              onClick={() => setSortNewest((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F6F1] hover:bg-[#EFECE6] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5C635E]" />
              {sortNewest ? 'Terbaru' : 'Terlama'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-12 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-7 h-7 text-[#156E33] animate-spin" />
            <p className="text-sm font-semibold text-[#1C241E]">Memuat data panen &amp; pesanan...</p>
          </div>
        )}

        {/* Content List */}
        {!isLoading && (
          <div className="space-y-6">
            {/* BAGIAN 1: PRODUK / HASIL PANEN YANG SUDAH DIPUBLIKASIKAN */}
            {filteredListings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1C241E] flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-[#156E33]" />
                    Hasil Panen yang Sudah Dipublikasikan ({filteredListings.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredListings.map((item) => {
                    const qty = Number(item.estimated_quantity || 0);
                    const price = Number(item.price_per_unit || 0);
                    const totalEst = qty * price;
                    const ton = (qty / 1000).toFixed(1).replace('.', ',');
                    const previewImg =
                      Array.isArray(item.media_urls) && item.media_urls.length > 0
                        ? item.media_urls[0]
                        : null;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#EFECE6] border-l-4 border-l-[#156E33] p-5 shadow-2xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#156E33] overflow-hidden flex items-center justify-center shrink-0">
                                {previewImg ? (
                                  <img
                                    src={previewImg}
                                    alt={item.title || item.commodity_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8F5EC] text-[#156E33] text-[10px] font-bold uppercase">
                                  Tayang di Pasar Tengkulak
                                </span>
                                <h3 className="text-base font-bold text-[#1C241E] mt-1">
                                  {item.title || item.commodity_name || 'Komoditas Panen'}
                                </h3>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-[#5C635E] line-clamp-2">
                            {item.description || 'Siap timbang dan muat di lokasi gudang tani.'}
                          </p>

                          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#F8F6F1] text-xs">
                            <div>
                              <p className="text-[11px] text-[#7A827C]">Volume Tersedia</p>
                              <p className="font-bold text-[#1C241E]">
                                {formatRupiah(qty)} {item.unit || 'kg'} ({ton} Ton)
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#7A827C]">Harga Harapan</p>
                              <p className="font-bold text-[#156E33]">
                                Rp {formatRupiah(price)} / {item.unit || 'kg'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#7A827C]">Siap Muat</p>
                              <p className="font-medium text-[#1C241E]">
                                {formatDate(item.ready_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#7A827C]">Estimasi Nilai</p>
                              <p className="font-bold text-[#1C241E]">
                                Rp {formatRupiah(totalEst)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-xs text-[#7A827C]">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#156E33] shrink-0" />
                            <span className="truncate">
                              {item.pickup_address || 'Lokasi Gudang Tani'}
                            </span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#156E33] shrink-0 ml-2">
                            {incomingOffersByListing.get(item.id)
                              ? `${incomingOffersByListing.get(item.id)} Penawaran Masuk`
                              : 'Menunggu Penawaran'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BAGIAN 2: DAFTAR PESANAN MASUK DARI PEMBELI */}
            {filteredOrders.length > 0 && (
              <div className="space-y-4">
                {activeTab === 'all' && filteredListings.length > 0 && (
                  <h2 className="text-sm font-bold text-[#1C241E] flex items-center gap-2 pt-2">
                    <Truck className="w-4 h-4 text-[#156E33]" />
                    Pesanan &amp; Penawaran Pembeli ({filteredOrders.length})
                  </h2>
                )}

                {filteredOrders.map((order: any) => {
                  const status = order.status || 'pending';
                  const isPending = isWaitingConfirmation(status);
                  const isScheduled = isScheduledOrder(status);
                  const isCompleted = status === 'completed';

                  const borderColor = isCompleted
                    ? 'border-l-[#156E33]'
                    : isScheduled
                    ? 'border-l-[#D97706]'
                    : isPending
                    ? 'border-l-[#EAB308]'
                    : 'border-l-[#9AA19C]';

                  const badgeStyle = isCompleted
                    ? 'bg-[#E8F5EC] text-[#156E33]'
                    : isScheduled
                    ? 'bg-[#FADEC9] text-[#9A4D16]'
                    : isPending
                    ? 'bg-[#FEF3C7] text-[#92400E]'
                    : 'bg-[#F2EFE9] text-[#5C635E]';

                  const statusLabel =
                    order.status_label ||
                    (isCompleted
                      ? 'Transaksi Selesai & Lunas'
                      : status === 'in_transit'
                      ? 'Armada Menuju Lokasi'
                      : isScheduled
                      ? 'Dijadwalkan Dijemput'
                      : status === 'in_negotiation'
                      ? 'Dalam Negosiasi'
                      : isPending
                      ? 'Menunggu Persetujuan Anda'
                      : 'Dibatalkan');

                  const qty = Number(order.offered_quantity ?? order.quantity ?? order.estimated_quantity ?? 0);
                  const unitPrice = Number(order.offered_price ?? order.agreed_price ?? order.price_per_unit ?? 0);
                  const totalPrice = Number(
                    order.total_offered_price ?? order.total_price ?? order.total_amount ?? qty * unitPrice
                  );

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border border-[#EFECE6] border-l-4 ${borderColor} p-5 sm:p-6 shadow-2xs space-y-5`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F2EFE9]">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold ${badgeStyle}`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isScheduled ? (
                              <Truck className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {statusLabel}
                          </span>
                          <span className="font-semibold text-[#7A827C]">{order.order_code || `#${order.id}`}</span>
                          {order.created_at && (
                            <span className="text-[#9AA19C]">
                              • {formatDate(order.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[11px] text-[#7A827C]">
                            {isCompleted ? 'Total Dana Diterima' : isPending ? 'Total Penawaran' : 'Nilai Kesepakatan'}
                          </p>
                          <p
                            className={`text-lg sm:text-xl font-bold ${
                              isCompleted ? 'text-[#156E33]' : 'text-[#1C241E]'
                            }`}
                          >
                            Rp {formatRupiah(totalPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        <div className="md:col-span-5 flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center shrink-0">
                            <Wheat className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#156E33]">
                              KOMODITAS
                            </span>
                            <h3 className="text-base font-bold text-[#1C241E]">
                              {order.commodity_name || order.title || 'Hasil Panen'}
                            </h3>
                            <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded bg-[#F5F2EB] font-bold text-[#1C241E]">
                                Volume: {formatRupiah(qty)} {order.unit || 'Kg'}
                              </span>
                              {unitPrice > 0 && (
                                <span className="text-[#7A827C]">
                                  @ Rp {formatRupiah(unitPrice)} / {order.unit || 'kg'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-4 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A827C]">
                            PEMBELI TERDAFTAR
                          </span>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-[#1C241E]">
                              {order.buyer_name || 'Mitra Pembeli Tandur'}
                            </h4>
                            <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0" />
                          </div>
                          <p className="text-xs text-[#5C635E]">
                            {order.pickup_address || 'Lokasi Penjemputan Terdaftar'}
                          </p>
                        </div>

                        <div className="md:col-span-3 rounded-xl bg-[#F8F6F1] p-3.5 space-y-1.5 text-xs">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5C635E]">
                            <Clock className="w-3.5 h-3.5 text-[#156E33]" />
                            Jadwal Penjemputan
                          </p>
                          <p className="font-bold text-[#1C241E]">
                            {formatDate(order.pickup_date || order.ready_date)}
                          </p>
                          {order.pickup_time_slot && (
                            <p className="text-[11px] text-[#5C635E]">{order.pickup_time_slot}</p>
                          )}
                          {order.notes && (
                            <p className="text-[11px] text-[#7A827C] line-clamp-2">{order.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons sesuai status: Accept, Negotiate, Reject, Confirm Ready */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {order.buyer_phone && (
                          <button
                            type="button"
                            onClick={() =>
                              Swal.fire({
                                icon: 'info',
                                title: 'Kontak Pembeli',
                                text: `${order.buyer_name || 'Pembeli'}: ${order.buyer_phone}`,
                                confirmButtonColor: '#156E33',
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Hubungi Pembeli
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAcceptOffer(order.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Terima Penawaran &amp; Jadwalkan
                            </button>
                            {status === 'in_negotiation' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E] text-xs font-semibold border border-[#FDE68A]">
                                <Clock className="w-3.5 h-3.5 text-[#B45309]" />
                                Negosiasi Terkirim (Rp {formatRupiah(order.counter_price || 0)})
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleNegotiateOffer(order)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E2DA] hover:bg-[#FAF8F4] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5 text-[#8A5A19]" />
                                Negosiasi Harga
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRejectOffer(order.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Tolak Penawaran
                            </button>
                          </>
                        )}

                        {isScheduled && (
                          <>
                            {order.is_ready_for_pickup ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8F5EC] text-[#156E33] text-xs font-bold border border-[#CDEBD4]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Lumbung Siap Muat (Terkonfirmasi)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirmReady(order.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Konfirmasi Siap Muat
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleShareLocation(order)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] text-xs font-semibold text-[#1C241E] transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#156E33]" />
                              Titik Jemput
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State jika belum ada listing maupun pesanan */}
            {ordersError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {ordersError}
              </div>
            )}
            {!ordersError && filteredListings.length === 0 && filteredOrders.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#EFECE6] p-10 sm:p-14 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F5EC] text-[#156E33] flex items-center justify-center mx-auto">
                  <Wheat className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C241E]">
                  Belum Ada Data Panen atau Pesanan
                </h3>
                <p className="text-xs sm:text-sm text-[#7A827C] max-w-md mx-auto">
                  {searchQuery
                    ? 'Tidak ditemukan hasil yang sesuai dengan kata kunci pencarian Anda.'
                    : 'Publikasikan hasil panen Anda sekarang agar tengkulak dan pengepul terverifikasi dapat mengajukan penawaran.'}
                </p>
                {!searchQuery && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/farmer/jual-panen')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#156E33] hover:bg-[#105728] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Publikasikan Hasil Panen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}