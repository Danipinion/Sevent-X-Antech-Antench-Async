import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  PlusCircle,
  Grip,
  Archive,
  Sprout,
  Wheat,
  ArrowRight,
  Send,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  fetchApi,
  FarmerApi,
  type Commodity,
  type FarmerPurchaseOrder,
} from '@/services/api';

interface CommodityPrice {
  id: string;
  category: string;
  name: string;
  price: string;
  trend: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

interface OrderSummary {
  id: string;
  idColor: string;
  commodity: string;
  buyer: string;
  weighDate: string;
  totalValue: string;
  valueColor: string;
  status: 'on-way' | 'unweighed' | 'completed';
  statusLabel: string;
}

interface FarmerDashboardPageProps {
  onNavigate?: (route: string) => void;
}

const FALLBACK_COMMODITIES: CommodityPrice[] = [
  {
    id: 'gkp',
    category: 'PADI / BERAS',
    name: 'Gabah Kering\nPanen',
    price: 'Rp 7.200',
    trend: '↑ Rp 150',
    isPositive: true,
    icon: <Grip className="w-4 h-4 text-[#156E33]" />,
  },
  {
    id: 'gkg',
    category: 'PADI / BERAS',
    name: 'Gabah Kering\nGiling',
    price: 'Rp 8.100',
    trend: '— Stabil',
    isPositive: false,
    icon: <Archive className="w-4 h-4 text-[#156E33]" />,
  },
  {
    id: 'jagung',
    category: 'PALAWIJA',
    name: 'Jagung Pipil\nKering',
    price: 'Rp 5.600',
    trend: '↑ Rp 200',
    isPositive: true,
    icon: <Sprout className="w-4 h-4 text-[#8C5828]" />,
  },
  {
    id: 'kedelai',
    category: 'PALAWIJA',
    name: 'Kedelai Lokal\nBersih',
    price: 'Rp 11.200',
    trend: '— Stabil',
    isPositive: false,
    icon: <Wheat className="w-4 h-4 text-[#8C5828]" />,
  },
];

export default function FarmerDashboardPage({ onNavigate }: FarmerDashboardPageProps = {}) {
  const navigate = useNavigate();
  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      navigate(route);
    }
  };

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const displayName = storedUser?.name ? storedUser.name.split(' ')[0] : 'Sugeng';
  const isVerified = Boolean(storedUser?.is_verified ?? true);

  const [commodityPrices, setCommodityPrices] = useState<CommodityPrice[]>(FALLBACK_COMMODITIES);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Hari ini, 07:30 WIB');

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);

    // 1. Fetch harga komoditas dari backend (/commodities)
    try {
      const res = await fetchApi<{ data?: Commodity[] } | Commodity[]>('/commodities');
      const list = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
        ? res
        : [];

      if (list.length > 0) {
        const mapped: CommodityPrice[] = list.map((item: any, idx: number) => {
          const priceVal =
            item.current_market_price || item.average_price || item.base_price || 0;
          const diff = (item.current_market_price || 0) - (item.base_price || 0);
          const trendText =
            item.trend_label ||
            (diff > 0
              ? `↑ Rp ${diff.toLocaleString('id-ID')}`
              : diff < 0
              ? `↓ Rp ${Math.abs(diff).toLocaleString('id-ID')}`
              : '— Stabil');
          const isPos =
            diff > 0 ||
            item.trend === 'UP' ||
            (item.percentage_change && item.percentage_change > 0);

          const isPalawija =
            item.category?.toLowerCase().includes('palawija') ||
            item.name?.toLowerCase().includes('jagung') ||
            item.name?.toLowerCase().includes('kedelai');

          return {
            id: item.id || `com-${idx}`,
            category: (item.category || 'KOMODITAS').toUpperCase(),
            name: item.name || 'Komoditas',
            price: `Rp ${priceVal.toLocaleString('id-ID')}`,
            trend: trendText,
            isPositive: isPos,
            icon: isPalawija ? (
              <Sprout className="w-4 h-4 text-[#8C5828]" />
            ) : (
              <Grip className="w-4 h-4 text-[#156E33]" />
            ),
          };
        });

        setCommodityPrices(mapped);
        setLastUpdated(
          `Hari ini, ${new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })} WIB`
        );
      }
    } catch {
      // Fallback aman tetap menggunakan FALLBACK_COMMODITIES
    }

    // 2. Fetch pesanan petani dari backend (/orders)
    try {
      const resOrders = await FarmerApi.getOrders();
      const listOrders = Array.isArray(resOrders?.data)
        ? resOrders.data
        : Array.isArray(resOrders)
        ? (resOrders as unknown as FarmerPurchaseOrder[])
        : [];

      const mappedOrders: OrderSummary[] = listOrders.map((ord: any) => {
        const rawStatus = String(ord.status || '').toLowerCase();
        const isCompleted = rawStatus === 'completed' || rawStatus === 'lunas';
        const isOnWay =
          rawStatus === 'in_transit' ||
          rawStatus === 'scheduled' ||
          rawStatus === 'scheduled_pickup' ||
          rawStatus === 'on-way';

        const weightKg = Number(ord.weight_kg ?? ord.offered_quantity ?? 0);
        const weightDisplay =
          weightKg >= 1000
            ? `${(weightKg / 1000).toFixed(1)} Ton`
            : `${weightKg.toLocaleString('id-ID')} Kg`;

        const totalVal = Number(ord.total_price ?? ord.total_offered_price ?? 0);

        return {
          id: ord.po_number || ord.order_code || ord.id || '#TRX',
          idColor: isCompleted
            ? 'text-[#156E33]'
            : isOnWay
            ? 'text-[#9A4D16]'
            : 'text-[#1C241E]',
          commodity: `${ord.commodity_name || 'Komoditas'} • ${weightDisplay}`,
          buyer: ord.buyer_name || 'Mitra Pembeli',
          weighDate: ord.pickup_date || ord.created_at || 'Terjadwal',
          totalValue: `${isCompleted ? '' : 'Est. '}Rp ${totalVal.toLocaleString('id-ID')}`,
          valueColor: isCompleted
            ? 'text-[#156E33]'
            : isOnWay
            ? 'text-[#9A4D16]'
            : 'text-[#1C241E]',
          status: isCompleted ? 'completed' : isOnWay ? 'on-way' : 'unweighed',
          statusLabel:
            ord.status_label ||
            (isCompleted
              ? 'Lunas & Terkirim'
              : isOnWay
              ? 'Menuju Lokasi'
              : 'Belum Timbang'),
        };
      });

      setRecentOrders(mappedOrders);
    } catch {
      setRecentOrders([]);
    } finally {
      setIsLoadingOrders(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const renderStatusBadge = (status: OrderSummary['status'], label: string) => {
    switch (status) {
      case 'on-way':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FADEC9] text-[#9A4D16] whitespace-nowrap">
            <Send className="w-3 h-3" />
            {label}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EC] text-[#156E33] whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EBE8E1] text-[#5C635E] whitespace-nowrap">
            <Lock className="w-3 h-3" />
            {label}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-[#EFECE6] bg-gradient-to-br from-[#FBF8F3] via-[#F7F3EA] to-[#E6EFE7] p-6 sm:p-8 shadow-xs">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#E5E2DA] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#156E33]" />
              <span className="text-xs font-semibold text-[#156E33]">
                {isVerified ? 'Mitra Petani Terverifikasi' : 'Akun Petani Aktif'}
              </span>
              {isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#156E33] fill-[#156E33]/10" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
                Selamat Pagi, {displayName}!
              </h1>
              <p className="text-sm sm:text-base text-[#5C635E] leading-relaxed">
                Musim Panen Gabah &amp; Palawija siap ditransaksikan. Akses pembeli langsung tanpa
                perantara dengan jaminan penimbangan jujur dan pelunasan instan.
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('/farmer/jual-panen')}
                className="inline-flex items-center gap-2 bg-[#156E33] hover:bg-[#105728] active:scale-[0.99] text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Jual Hasil Panen Sekarang
              </button>

              {!isVerified && (
                <button
                  type="button"
                  onClick={() => handleNavigate('/farmer/verifikasi')}
                  className="inline-flex items-center gap-2 bg-white hover:bg-[#F5F2EB] text-[#156E33] border border-[#DCE6DF] font-semibold text-sm px-4 py-3 rounded-xl transition-all cursor-pointer"
                >
                  Lengkapi Verifikasi KTP
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Pantauan Harga Komoditas Hari Ini */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#1C241E]">
                Pantauan Harga Komoditas Hari Ini
              </h2>
              <p className="text-xs sm:text-sm text-[#5C635E]">
                Pembaruan otomatis dari pasar riil Tandur &amp; Badan Pangan Nasional (Bapanas) Jawa Timur.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#EFECE6]/80 hover:bg-[#E5E0D5] text-xs font-medium text-[#3D4740] transition-colors cursor-pointer disabled:opacity-60"
              title="Muat ulang data dari server"
            >
              <RefreshCw className={`w-3 h-3 text-[#156E33] ${isRefreshing ? 'animate-spin' : ''}`} />
              Terakhir diperbarui: {lastUpdated}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {commodityPrices.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-2xs hover:border-[#D8D3C8] transition-colors flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A827C]">
                      {item.category}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-[#1C241E] whitespace-pre-line leading-snug">
                      {item.name}
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#F4F1EA] flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-[#7A827C]">Harga Rata-rata</p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[#156E33]">{item.price}</span>
                    <span className="text-xs text-[#7A827C]">/ kg</span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        item.isPositive
                          ? 'bg-[#E8F5EC] text-[#156E33]'
                          : 'bg-[#F2EFE9] text-[#5C635E]'
                      }`}
                    >
                      {item.trend}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabel Ringkasan Pesanan */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#1C241E]">Tabel Ringkasan Pesanan</h2>
              <p className="text-xs sm:text-sm text-[#5C635E]">
                Daftar lengkap transaksi panen, jadwal penimbangan, dan status pembayaran terkini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('/farmer/pesanan')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#156E33] hover:text-[#105728] transition-colors self-start sm:self-auto cursor-pointer"
            >
              Kelola Semua Pesanan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFECE6] shadow-2xs overflow-hidden">
            {isLoadingOrders ? (
              <div className="p-8 text-center text-xs sm:text-sm text-[#7A827C]">
                Memuat daftar transaksi panen dari server...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-bold text-[#1C241E]">
                  Belum ada pesanan masuk saat ini
                </p>
                <p className="text-xs text-[#7A827C]">
                  Publikasikan hasil panen Anda agar tengkulak mitra dapat mengajukan penawaran beli.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F3EFE8] border-b border-[#EAE5DC] text-[11px] font-bold uppercase tracking-wider text-[#5C635E]">
                      <th className="py-3.5 pl-6 pr-4">ID PESANAN</th>
                      <th className="py-3.5 px-4">KOMODITAS &amp; VOLUME</th>
                      <th className="py-3.5 px-4">PEMBELI</th>
                      <th className="py-3.5 px-4">TANGGAL TIMBANG</th>
                      <th className="py-3.5 px-4">TOTAL NILAI</th>
                      <th className="py-3.5 pl-4 pr-6">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EFE9] text-sm">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-[#FAF8F4] transition-colors"
                      >
                        <td className={`py-4 pl-6 pr-4 font-bold whitespace-nowrap ${order.idColor}`}>
                          {order.id}
                        </td>
                        <td className="py-4 px-4 font-semibold text-[#1C241E] min-w-[200px]">
                          {order.commodity}
                        </td>
                        <td className="py-4 px-4 text-[#5C635E] min-w-[160px]">
                          {order.buyer}
                        </td>
                        <td className="py-4 px-4 text-[#5C635E] whitespace-nowrap">
                          {order.weighDate}
                        </td>
                        <td className={`py-4 px-4 font-bold whitespace-nowrap ${order.valueColor}`}>
                          {order.totalValue}
                        </td>
                        <td className="py-4 pl-4 pr-6">
                          {renderStatusBadge(order.status, order.statusLabel)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}