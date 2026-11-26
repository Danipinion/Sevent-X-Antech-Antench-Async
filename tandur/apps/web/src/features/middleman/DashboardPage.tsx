import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Hourglass,
  Truck,
  Users,
  Calendar,
  Info,
  RefreshCw,
  ArrowUp,
  TrendingUp,
  CheckCircle2,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchApi, MiddlemanApi, type Commodity } from '@/services/api';

interface DashboardPageProps {
  onNavigate?: (route: string) => void;
}

interface HarvestPriceItem {
  id: string;
  name: string;
  desc: string;
  price: string;
  trend: 'up' | 'stabil';
  trendLabel: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const [harvestPrices, setHarvestPrices] = useState<HarvestPriceItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const displayName = storedUser?.name || 'Mitra Pengepul';
  const regionLabel = storedUser?.city || storedUser?.district || 'Wilayah Operasional';

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [commoditiesRes, ordersRes] = await Promise.allSettled([
        fetchApi<{ data?: Commodity[] } | Commodity[]>('/commodities'),
        MiddlemanApi.getPurchaseOrders(),
      ]);

      // 1. Proses Data Harga Acuan Panen dari API /commodities
      if (commoditiesRes.status === 'fulfilled') {
        const raw = commoditiesRes.value;
        const list = Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : Array.isArray(raw)
          ? raw
          : [];

        const mapped: HarvestPriceItem[] = list.map((c: any) => {
          const currentPrice = Number(c.current_market_price ?? c.base_price ?? c.price ?? 0);
          const basePrice = Number(c.base_price ?? currentPrice);
          const diff = currentPrice - basePrice;

          return {
            id: String(c.id || c.name),
            name: c.name || 'Komoditas',
            desc: c.description || c.category || 'Standar Kualitas Pasar',
            price: `Rp ${currentPrice.toLocaleString('id-ID')}`,
            trend: diff > 0 ? 'up' : 'stabil',
            trendLabel: diff > 0 ? `+Rp ${diff.toLocaleString('id-ID')}` : '— Stabil',
          };
        });

        setHarvestPrices(mapped);
      } else {
        setHarvestPrices([]);
      }

      // 2. Proses Data Purchase Orders (PO) & Jadwal Armada dari API
      if (ordersRes.status === 'fulfilled') {
        const rawOrders = ordersRes.value;
        const orderList = Array.isArray((rawOrders as any)?.data)
          ? (rawOrders as any).data
          : Array.isArray(rawOrders)
          ? rawOrders
          : [];
        setPurchaseOrders(orderList);
      } else {
        setPurchaseOrders([]);
      }
    } catch {
      setHarvestPrices([]);
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(false);
  }, []);

  // Kalkulasi dinamis untuk 4 Summary Cards
  const activeOrders = useMemo(() => {
    return purchaseOrders.filter(
      (o) => !['completed', 'cancelled', 'Selesai', 'Dibatalkan'].includes(o.status)
    );
  }, [purchaseOrders]);

  const readyToWeighCount = useMemo(() => {
    return activeOrders.filter((o) =>
      ['scheduled', 'Surat Jalan Terbit', 'Siap Timbang'].includes(o.status)
    ).length;
  }, [activeOrders]);

  const inTransitCount = useMemo(() => {
    return activeOrders.filter((o) =>
      ['in_transit', 'Menuju Gudang'].includes(o.status)
    ).length;
  }, [activeOrders]);

  const totalTonase = useMemo(() => {
    const sumKg = activeOrders.reduce((acc, o) => {
      const kg = Number(o.weight_kg ?? o.quantity ?? o.estimated_quantity ?? 0);
      return acc + kg;
    }, 0);
    return (sumKg / 1000).toFixed(1);
  }, [activeOrders]);

  const uniqueCommoditiesSummary = useMemo(() => {
    const names = Array.from(
      new Set(
        activeOrders
          .map((o) => o.commodity_name || o.commodity)
          .filter(Boolean)
      )
    );
    if (names.length === 0) return 'Belum ada komoditas';
    return names.slice(0, 2).join(' & ');
  }, [activeOrders]);

  const nearestScheduleOrder = useMemo(() => {
    return activeOrders[0] || null;
  }, [activeOrders]);

  const uniqueFarmersCount = useMemo(() => {
    const farmers = new Set(
      purchaseOrders
        .map((o) => o.farmer_id || o.farmer_name)
        .filter(Boolean)
    );
    return farmers.size;
  }, [purchaseOrders]);

  const handleGoToFindFarmers = () => {
    if (onNavigate) {
      onNavigate('/middleman/cari-pasokan');
    } else {
      navigate('/middleman/cari-pasokan');
    }
  };

  const handleConfirmSlot = async (order: any) => {
    if (!order?.id) return;
    setConfirmingOrderId(order.id);
    try {
      await MiddlemanApi.updatePurchaseOrder(order.id, {
        status: 'Surat Jalan Terbit',
        schedule_info: order.schedule_info || 'Jadwal Muat Terkonfirmasi',
      });

      setPurchaseOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, status: 'Surat Jalan Terbit' }
            : item
        )
      );

      await Swal.fire({
        icon: 'success',
        title: 'Slot Armada Dikonfirmasi',
        text: `Jadwal muat untuk ${order.farmer_name || 'Petani Mitra'} telah dikunci dan surat jalan diterbitkan.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Mengonfirmasi Jadwal',
        text: err?.message || 'Tidak dapat memperbarui status jadwal ke server.',
        confirmButtonColor: '#236B37',
      });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Greeting Banner */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-[#ECE6DA] p-6 sm:p-7 shadow-[0_2px_10px_rgba(30,36,30,0.02)]">
          {/* Dekorasi lingkaran halus di kanan */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#F5F1E8]/70" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFE6] text-[#7D5318] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2B7A3E]" />
                Pantauan Pengadaan Aktif • {regionLabel}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A201A] tracking-tight">
                Selamat Pagi, {displayName}
              </h1>
              <p className="text-sm text-[#5C645C] leading-relaxed">
                Ringkasan pengadaan komoditas dan jadwal timbang gabah wilayah {regionLabel} terkelola secara real-time.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoToFindFarmers}
              className="inline-flex items-center justify-center gap-2.5 bg-[#236B37] hover:bg-[#1B552B] active:scale-[0.99] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
              Cari Pasokan Petani
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#6D756D] uppercase">
                PO AKTIF BERJALAN
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A201A]">
                {isLoading ? '...' : `${activeOrders.length} Kontrak`}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs font-medium">
                <span className="text-[#236B37] font-semibold">
                  {readyToWeighCount} Siap Timbang
                </span>
                <span className="text-[#9AA19A]">•</span>
                <span className="text-[#6D756D]">{inTransitCount} Menuju Gudang</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#6D756D] uppercase">
                TONASE PENGADAAN
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <Hourglass className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A201A]">
                {isLoading ? '...' : `${totalTonase} Ton`}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium truncate">
                <span className="text-[#8A5A19] font-semibold truncate">
                  {uniqueCommoditiesSummary}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#6D756D] uppercase">
                MUAT TERDEKAT
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A201A] truncate">
                {isLoading
                  ? '...'
                  : nearestScheduleOrder?.schedule_info ||
                    nearestScheduleOrder?.pickup_date ||
                    'Belum Ada'}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium truncate">
                {nearestScheduleOrder ? (
                  <>
                    <span className="text-[#8A5A19] font-semibold truncate">
                      {nearestScheduleOrder.pickup_location ||
                        nearestScheduleOrder.pickup_address ||
                        'Lokasi Petani'}
                    </span>
                    <span className="text-[#9AA19A]">•</span>
                    <span className="text-[#6D756D] shrink-0">
                      {(
                        Number(
                          nearestScheduleOrder.weight_kg ??
                            nearestScheduleOrder.quantity ??
                            0
                        ) / 1000
                      ).toFixed(1)}{' '}
                      Ton
                    </span>
                  </>
                ) : (
                  <span className="text-[#6D756D]">Tidak ada jadwal armada aktif</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#6D756D] uppercase">
                PETANI MITRA
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A201A]">
                {isLoading ? '...' : `${uniqueFarmersCount} Mitra`}
              </div>
              <div className="mt-1.5 text-xs text-[#6D756D] truncate">
                Wilayah <span className="font-semibold text-[#1A201A]">{regionLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Jadwal Muat & Timbang Lapangan (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  Jadwal Muat &amp; Timbang Lapangan
                </h2>
                <p className="text-xs sm:text-sm text-[#6D756D] mt-0.5">
                  Logistik armada dan alokasi petani aktif
                </p>
              </div>
              <span className="self-start px-3 py-1 rounded-full bg-[#F3EFE6] text-[#6E5636] text-xs font-semibold">
                {activeOrders.length} Armada Terjadwal
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-[#6D756D] space-y-2">
                <Loader2 className="w-6 h-6 text-[#236B37] animate-spin" />
                <span>Memuat jadwal armada &amp; penimbangan...</span>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="bg-[#F6F2EA] rounded-xl p-8 border border-[#EDE6D8] text-center space-y-2.5">
                <PackageOpen className="w-8 h-8 text-[#8A5A19] mx-auto" />
                <p className="text-sm font-bold text-[#1A201A]">
                  Belum Ada Jadwal Muat Aktif
                </p>
                <p className="text-xs text-[#6D756D] max-w-md mx-auto">
                  Cari pasokan panen dari petani mitra untuk membuat kontrak pengadaan dan jadwal penjemputan armada.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoToFindFarmers}
                    className="inline-flex items-center gap-1.5 bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Cari Pasokan Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order: any) => {
                  const isConfirmed = [
                    'Surat Jalan Terbit',
                    'scheduled',
                    'in_transit',
                  ].includes(order.status);

                  const tonVal = (
                    Number(order.weight_kg ?? order.quantity ?? order.estimated_quantity ?? 0) /
                    1000
                  ).toFixed(1);

                  return (
                    <div
                      key={order.id}
                      className="bg-[#F6F2EA] rounded-xl p-4 sm:p-5 border border-[#EDE6D8] space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5DEC9] text-[11px] font-bold text-[#2D332D]">
                          {order.vehicle_plate || order.fleet_info || `PO #${order.id}`}
                        </span>
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#DCF1E1] text-[#1E6632] text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {order.status === 'scheduled'
                              ? 'Surat Jalan Terbit'
                              : order.status}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-[#F5E6CD] text-[#8A5A19] text-xs font-semibold">
                            {order.status || 'Konfirmasi Jadwal'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                        <div>
                          <div className="font-bold text-sm sm:text-base text-[#1A201A]">
                            {order.farmer_name || 'Petani Mitra'}
                          </div>
                          <div className="text-xs text-[#6D756D] mt-0.5">
                            {order.farmer_group || order.farmer_region || 'Mitra Tandur'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                            KOMODITAS &amp; ESTIMASI
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-[#236B37] mt-0.5">
                            {tonVal} Ton {order.commodity_name || order.commodity || ''}
                          </div>
                          {order.packaging && (
                            <div className="text-xs text-[#6D756D]">{order.packaging}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                            WAKTU &amp; TITIK MUAT
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-[#1A201A] mt-0.5">
                            {order.schedule_info || order.pickup_date || 'Menunggu Jadwal'}
                          </div>
                          <div className="text-xs text-[#6D756D]">
                            {order.pickup_location || order.pickup_address || '-'}
                          </div>
                        </div>
                      </div>

                      {!isConfirmed && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={confirmingOrderId === order.id}
                            onClick={() => handleConfirmSlot(order)}
                            className="inline-flex items-center gap-2 bg-[#8A5A19] hover:bg-[#734A13] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            {confirmingOrderId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5" />
                            )}
                            Konfirmasi Slot
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Banner Bottom */}
            <div className="flex items-start gap-3 bg-[#F4EFE6] rounded-xl p-3.5 border border-[#E8E0D1] text-xs text-[#555D55]">
              <Info className="w-4 h-4 text-[#236B37] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Setiap penimbangan wajib disertai lembar tera metrologi digital aktif yang tervalidasi di aplikasi Tandur.
              </p>
            </div>
          </div>

          {/* Right Column: Harga Acuan Panen (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  Harga Acuan Panen
                </h2>
                <p className="text-xs sm:text-sm text-[#6D756D] mt-0.5">
                  Rujukan Pasar Tingkat Penggilingan {regionLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadDashboardData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A5A19] hover:underline shrink-0 cursor-pointer disabled:opacity-50"
                title="Muat ulang harga acuan"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Hari ini</span>
              </button>
            </div>

            {/* Price Items */}
            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-center text-xs text-[#6D756D] space-y-2">
                <Loader2 className="w-5 h-5 text-[#8A5A19] animate-spin" />
                <span>Memuat harga acuan komoditas...</span>
              </div>
            ) : harvestPrices.length === 0 ? (
              <div className="bg-[#F6F2EA] rounded-xl p-6 border border-[#EDE6D8] text-center text-xs text-[#6D756D]">
                Data harga acuan pasar belum tersedia dari server.
              </div>
            ) : (
              <div className="space-y-3">
                {harvestPrices.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#F6F2EA] rounded-xl px-4 py-3.5 border border-[#EDE6D8] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#1A201A]">{item.name}</div>
                      <div className="text-xs text-[#6D756D] mt-0.5">{item.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">
                        <span className={item.trend === 'up' ? 'text-[#236B37]' : 'text-[#1A201A]'}>
                          {item.price}
                        </span>{' '}
                        <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-semibold">
                        {item.trend === 'up' ? (
                          <span className="inline-flex items-center text-[#236B37]">
                            <ArrowUp className="w-3 h-3 mr-0.5" />
                            {item.trendLabel}
                          </span>
                        ) : (
                          <span className="text-[#8A5A19]">{item.trendLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trend Footer Banner */}
            <div className="bg-[#F4EFE6] rounded-xl px-4 py-3 border border-[#E8E0D1] flex items-center gap-2.5 text-xs text-[#4C544C]">
              <TrendingUp className="w-4 h-4 text-[#8A5A19] shrink-0" />
              <span>
                {harvestPrices.length > 0
                  ? `Menampilkan ${harvestPrices.length} harga komoditas aktif terbaru dari pasar`
                  : 'Pantauan tren harga komoditas terhubung secara real-time'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;