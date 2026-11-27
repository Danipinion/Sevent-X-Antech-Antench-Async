import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Grip,
  Wheat,
  Sprout,
  CircleDot,
  Flame,
  MapPin,
  TrendingUp,
  Image as ImageIcon,
  Send,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
  BadgeAlert,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { FarmerApi, fetchApi } from '@/services/api';

export interface SP2KPCommodity {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  averagePrice: number;
  yesterdayPrice: number;
  minPrice: number;
  maxPrice: number;
  trend: string;
  trendLabel: string;
  source: string;
  subtitle: string;
}

const FALLBACK_SP2KP_COMMODITIES: SP2KPCommodity[] = [
  {
    id: '52',
    code: '52',
    name: 'Beras Medium',
    category: 'Beras',
    unit: 'kg',
    averagePrice: 14025,
    yesterdayPrice: 14025,
    minPrice: 11921,
    maxPrice: 16129,
    trend: 'STABLE',
    trendLabel: '— Stabil',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '51',
    code: '51',
    name: 'Beras Premium',
    category: 'Beras',
    unit: 'kg',
    averagePrice: 15710,
    yesterdayPrice: 15710,
    minPrice: 13354,
    maxPrice: 18067,
    trend: 'STABLE',
    trendLabel: '— Stabil',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '1',
    code: '1',
    name: 'Beras SPHP Bulog',
    category: 'Beras',
    unit: 'kg',
    averagePrice: 12371,
    yesterdayPrice: 12371,
    minPrice: 10515,
    maxPrice: 14227,
    trend: 'STABLE',
    trendLabel: '— Stabil',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Bulog / Kemendag',
  },
  {
    id: '14',
    code: '14',
    name: 'Gula Pasir Curah',
    category: 'Gula',
    unit: 'kg',
    averagePrice: 18673,
    yesterdayPrice: 18662,
    minPrice: 15872,
    maxPrice: 21474,
    trend: 'UP',
    trendLabel: '+Rp 11',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '48',
    code: '48',
    name: 'Kedelai Impor',
    category: 'Palawija',
    unit: 'kg',
    averagePrice: 13846,
    yesterdayPrice: 13846,
    minPrice: 11769,
    maxPrice: 15923,
    trend: 'STABLE',
    trendLabel: '— Stabil',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '2',
    code: '2',
    name: 'Cabai Merah Keriting',
    category: 'Cabai & Bawang',
    unit: 'kg',
    averagePrice: 66713,
    yesterdayPrice: 67466,
    minPrice: 56706,
    maxPrice: 76720,
    trend: 'DOWN',
    trendLabel: '-Rp 753',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '10',
    code: '10',
    name: 'Cabai Rawit Merah',
    category: 'Cabai & Bawang',
    unit: 'kg',
    averagePrice: 71862,
    yesterdayPrice: 72347,
    minPrice: 61083,
    maxPrice: 82641,
    trend: 'DOWN',
    trendLabel: '-Rp 485',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '13',
    code: '13',
    name: 'Bawang Merah',
    category: 'Cabai & Bawang',
    unit: 'kg',
    averagePrice: 34899,
    yesterdayPrice: 34811,
    minPrice: 29664,
    maxPrice: 40134,
    trend: 'UP',
    trendLabel: '+Rp 88',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: '38',
    code: '38',
    name: 'Bawang Putih Honan',
    category: 'Cabai & Bawang',
    unit: 'kg',
    averagePrice: 34112,
    yesterdayPrice: 34144,
    minPrice: 28995,
    maxPrice: 39229,
    trend: 'DOWN',
    trendLabel: '-Rp 32',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan SP2KP Kemendag RI',
  },
  {
    id: 'jagung',
    code: 'jagung',
    name: 'Jagung Pipil Kering',
    category: 'Palawija',
    unit: 'kg',
    averagePrice: 5600,
    yesterdayPrice: 5400,
    minPrice: 4760,
    maxPrice: 6440,
    trend: 'UP',
    trendLabel: '+Rp 200',
    source: 'sp2kp_kemendag',
    subtitle: 'Acuan Pasar Riil Tandur & SP2KP',
  },
];

const getCommodityIcon = (name: string, isSelected: boolean) => {
  const lower = name.toLowerCase();
  const cls = `w-4 h-4 ${isSelected ? 'text-white' : 'text-[#156E33]'}`;
  if (lower.includes('cabai') || lower.includes('bumbu')) {
    return <Flame className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#C84126]'}`} />;
  }
  if (lower.includes('kedelai') || lower.includes('jagung') || lower.includes('palawija')) {
    return <Sprout className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#8C5828]'}`} />;
  }
  if (lower.includes('bawang')) {
    return <CircleDot className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#8A388C]'}`} />;
  }
  if (lower.includes('beras') || lower.includes('padi') || lower.includes('gabah')) {
    return <Wheat className={cls} />;
  }
  return <Grip className={cls} />;
};

export default function SellHarvestPage() {
  const navigate = useNavigate();
  const sampleInputRef = useRef<HTMLInputElement | null>(null);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const defaultLocation =
    storedUser?.district && storedUser?.city
      ? `${storedUser.district}, ${storedUser.city}`
      : storedUser?.address || 'Sukamaju, Ngawi';

  // 1. Data Komoditas SP2KP
  const [commodities, setCommodities] = useState<SP2KPCommodity[]>(FALLBACK_SP2KP_COMMODITIES);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>(FALLBACK_SP2KP_COMMODITIES[0].id);
  const [commoditySearch, setCommoditySearch] = useState<string>('');
  const [isLoadingCommodities, setIsLoadingCommodities] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Memuat data SP2KP...');

  // 2. Form States (Varietas telah dihapus sesuai instruksi)
  const [weightKg, setWeightKg] = useState<number>(8500);
  const [readyDate, setReadyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [pickupLocation, setPickupLocation] = useState<string>(defaultLocation);
  
  // Ekspektasi harga per kg: default harga rata-rata SP2KP
  const [expectedPrice, setExpectedPrice] = useState<number>(FALLBACK_SP2KP_COMMODITIES[0].averagePrice);
  const [notes, setNotes] = useState<string>('');

  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Komoditas aktif terpilih
  const activeCommodity = useMemo(() => {
    return commodities.find((c) => c.id === selectedCommodityId) || commodities[0] || FALLBACK_SP2KP_COMMODITIES[0];
  }, [commodities, selectedCommodityId]);

  // Fetch Komoditas SP2KP dari API Backend (/commodities/realtime-prices atau /commodities)
  const fetchSp2kpCommodities = async () => {
    setIsLoadingCommodities(true);
    try {
      let rawList: any[] = [];
      try {
        const realtimeRes = await fetchApi<any>('/commodities/realtime-prices');
        if (Array.isArray(realtimeRes?.data) && realtimeRes.data.length > 0) {
          rawList = realtimeRes.data;
        }
      } catch {
        // Fallback ke /commodities
      }

      if (rawList.length === 0) {
        const commRes = await fetchApi<any>('/commodities');
        if (Array.isArray(commRes?.data)) {
          rawList = commRes.data;
        } else if (Array.isArray(commRes)) {
          rawList = commRes;
        }
      }

      if (rawList.length > 0) {
        const mapped: SP2KPCommodity[] = rawList.map((item: any, idx: number) => {
          const avgPrice = Number(item.average_price ?? item.current_market_price ?? item.base_price ?? 0);
          const yestPrice = Number(item.yesterday_price ?? item.base_price ?? avgPrice);
          const diff = avgPrice - yestPrice;

          const trendLabel =
            item.trend_label ||
            (diff > 0
              ? `+Rp ${diff.toLocaleString('id-ID')}`
              : diff < 0
              ? `-Rp ${Math.abs(diff).toLocaleString('id-ID')}`
              : '— Stabil');

          return {
            id: String(item.commodity_id || item.id || `sp2kp-${idx}`),
            code: String(item.commodity_id || item.id || `SP2KP-${idx}`),
            name: item.commodity_name || item.name || 'Komoditas SP2KP',
            category: item.category || 'Pangan & Pertanian',
            unit: item.unit || 'kg',
            averagePrice: avgPrice,
            yesterdayPrice: yestPrice,
            minPrice: Math.round(avgPrice * 0.85),
            maxPrice: Math.round(avgPrice * 1.15),
            trend: item.trend || (diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE'),
            trendLabel: trendLabel,
            source: item.source || 'sp2kp_kemendag',
            subtitle: `Acuan SP2KP Kemendag RI`,
          };
        });

        setCommodities(mapped);

        // Jika komoditas saat ini tidak ditemukan, pilih item pertama dan set harga rata-rata
        const exists = mapped.some((m) => m.id === selectedCommodityId);
        if (!exists && mapped.length > 0) {
          setSelectedCommodityId(mapped[0].id);
          setExpectedPrice(mapped[0].averagePrice);
        } else {
          const current = mapped.find((m) => m.id === selectedCommodityId);
          if (current) {
            setExpectedPrice(current.averagePrice);
          }
        }

        setLastRefreshedAt(
          `Hari ini, ${new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })} WIB`
        );
      }
    } catch {
      // Gunakan fallback SP2KP
      setCommodities(FALLBACK_SP2KP_COMMODITIES);
      setLastRefreshedAt('Sinkronisasi offline');
    } finally {
      setIsLoadingCommodities(false);
    }
  };

  useEffect(() => {
    fetchSp2kpCommodities();
  }, []);

  // Filter pencarian komoditas
  const filteredCommodities = useMemo(() => {
    if (!commoditySearch.trim()) return commodities;
    const q = commoditySearch.toLowerCase().trim();
    return commodities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q)
    );
  }, [commodities, commoditySearch]);

  // Handler memilih komoditas: Otomatis set harga harapan ke harga rata-rata SP2KP
  const handleSelectCommodity = (comm: SP2KPCommodity) => {
    setSelectedCommodityId(comm.id);
    setExpectedPrice(comm.averagePrice); // Default harga harapan = harga rata-rata SP2KP
  };

  const grossRevenue = weightKg * expectedPrice;
  const tonEquivalent = (weightKg / 1000).toFixed(1).replace('.', ',');

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(amount || 0));
  };

  const handleSamplePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran File Terlalu Besar',
        text: 'Maksimal ukuran foto sampel adalah 5MB.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    if (samplePreviewUrl) {
      URL.revokeObjectURL(samplePreviewUrl);
    }

    setSampleFile(file);
    setSamplePreviewUrl(URL.createObjectURL(file));
  };

  const handlePublishHarvest = async () => {
    if (isSubmitting) return;

    if (weightKg < 500) {
      await Swal.fire({
        icon: 'warning',
        title: 'Bobot Minimal 500 Kg',
        text: 'Estimasi berat hasil panen minimal 500 Kg untuk penjemputan armada.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    if (!pickupLocation.trim() || expectedPrice <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Pastikan lokasi titik muat dan harga harapan per kg sudah terisi dengan benar.',
        confirmButtonColor: '#156E33',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanWeight = Number(weightKg);
      const cleanPrice = Number(expectedPrice);
      const cleanNotes =
        notes.trim() ||
        `Komoditas ${activeCommodity.name} acuan SP2KP, siap timbang & muat mulai ${readyDate}.`;

      let mediaUrls: string[] = [];
      if (sampleFile) {
        try {
          const uploadRes = await FarmerApi.uploadMedia(sampleFile);
          if (uploadRes?.url) {
            mediaUrls = [uploadRes.url];
          }
        } catch (uploadErr: any) {
          await Swal.fire({
            icon: 'error',
            title: 'Gagal Mengunggah Foto',
            text: uploadErr?.message || 'Gagal menyimpan foto panen ke storage Garage.',
            confirmButtonColor: '#156E33',
          });
          setIsSubmitting(false);
          return;
        }
      }

      await FarmerApi.createListing({
        commodity_id: activeCommodity.id,
        commodity_name: activeCommodity.name,
        title: `${activeCommodity.name} - Siap Angkut`,
        description: cleanNotes,
        estimated_quantity: cleanWeight,
        min_order_quantity: 500,
        unit: activeCommodity.unit || 'kg',
        price_per_unit: cleanPrice,
        ready_date: readyDate,
        estimated_harvest_date: readyDate,
        pickup_address: pickupLocation.trim(),
        media_urls: mediaUrls,
        latitude: 0,
        longitude: 0,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Hasil Panen Dipublikasikan',
        text: `${activeCommodity.name} (${tonEquivalent} Ton) pada harga Rp ${formatRupiah(cleanPrice)}/${activeCommodity.unit} (Acuan SP2KP) berhasil diterbitkan ke jaringan tengkulak Tandur.`,
        confirmButtonText: 'Lihat Daftar Pesanan',
        confirmButtonColor: '#156E33',
      });

      navigate('/farmer/pesanan');
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Mempublikasikan Panen',
        text:
          err?.message ||
          'Tidak dapat mengirim data penawaran panen ke server. Pastikan Anda sudah login.',
        confirmButtonColor: '#156E33',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status daya saing harga terhadap rata-rata pasar SP2KP
  const priceDiffPercentage = useMemo(() => {
    if (!activeCommodity.averagePrice || activeCommodity.averagePrice === 0) return 0;
    return ((expectedPrice - activeCommodity.averagePrice) / activeCommodity.averagePrice) * 100;
  }, [expectedPrice, activeCommodity]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title Section */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] text-xs font-semibold">
              <Store className="w-3.5 h-3.5" />
              Kanal Penjualan Langsung Petani
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F2ECE1] text-[#7A5B28] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#156E33]" />
              Terhubung SP2KP Kemendag RI
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
            Jual Hasil Panen &amp; Dapatkan Penawaran Terbaik
          </h1>
          <p className="text-sm text-[#5C635E] max-w-3xl leading-relaxed">
            Publikasikan hasil panen Anda ke 1.200+ tengkulak &amp; pengepul terverifikasi dengan
            acuan harga pasar riil SP2KP Kemendag, timbangan digital transparan, dan jaminan pelunasan di hari timbang.
          </p>
        </div>

        {/* Hidden Sample Photo Input */}
        <input
          ref={sampleInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSamplePhotoChange}
          className="hidden"
        />

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Step 1: Pilih Jenis Komoditas (SP2KP) */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#1C241E]">Pilih Jenis Komoditas</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F5EC] text-[#156E33]">
                        Acuan SP2KP
                      </span>
                    </div>
                    <p className="text-xs text-[#7A827C] mt-0.5">
                      Sinkron otomatis dengan komoditas Beranda dan pantauan harga SP2KP Kemendag RI.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchSp2kpCommodities}
                    disabled={isLoadingCommodities}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#156E33] bg-[#F3FAF5] hover:bg-[#E8F5EC] transition-colors cursor-pointer disabled:opacity-50"
                    title="Perbarui data harga komoditas SP2KP"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCommodities ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Sinkronkan</span>
                  </button>
                  <span className="text-xs font-semibold text-[#156E33] shrink-0">Wajib Diisi</span>
                </div>
              </div>

              {/* Search Bar Komoditas */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#7A827C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari komoditas SP2KP (Beras, Cabai, Bawang, Kedelai, Gula, dll)..."
                  value={commoditySearch}
                  onChange={(e) => setCommoditySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8F6F1] border border-[#ECE8DF] text-xs sm:text-sm text-[#1C241E] placeholder:text-[#9AA19C] focus:bg-white focus:border-[#156E33] outline-none transition-all"
                />
              </div>

              {/* Grid Pilihan Komoditas SP2KP */}
              {isLoadingCommodities && commodities.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[#156E33] animate-spin" />
                  <p className="text-xs text-[#5C635E]">Memuat katalog harga komoditas SP2KP Kemendag...</p>
                </div>
              ) : filteredCommodities.length === 0 ? (
                <div className="py-8 text-center bg-[#FAF8F4] rounded-xl border border-dashed border-[#DFD8CA]">
                  <p className="text-xs font-semibold text-[#5C635E]">
                    Komoditas "{commoditySearch}" tidak ditemukan di data SP2KP.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCommoditySearch('')}
                    className="mt-2 text-xs text-[#156E33] font-bold hover:underline cursor-pointer"
                  >
                    Tampilkan Semua Komoditas
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 max-h-[360px] overflow-y-auto pr-1">
                  {filteredCommodities.map((item) => {
                    const isSelected = selectedCommodityId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCommodity(item)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#156E33] border-[#156E33] text-white shadow-xs'
                            : 'bg-[#F8F6F1] border-[#ECE8DF] text-[#1C241E] hover:border-[#D4CFC3]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span>{getCommodityIcon(item.name, isSelected)}</span>
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                item.trend === 'UP'
                                  ? 'bg-[#FDF2F0] text-[#C84126]'
                                  : item.trend === 'DOWN'
                                  ? 'bg-[#F0FDF4] text-[#156E33]'
                                  : 'bg-[#EAE6DC] text-[#5C635E]'
                              }`}
                            >
                              {item.trendLabel}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-tight">{item.name}</p>
                          <p
                            className={`text-xs font-bold mt-1 ${
                              isSelected ? 'text-white' : 'text-[#156E33]'
                            }`}
                          >
                            Rp {formatRupiah(item.averagePrice)}{' '}
                            <span
                              className={`text-[10px] font-normal ${
                                isSelected ? 'text-white/80' : 'text-[#7A827C]'
                              }`}
                            >
                              / {item.unit}
                            </span>
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 truncate ${
                              isSelected ? 'text-white/75' : 'text-[#7A827C]'
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Spesifikasi & Estimasi Bobot (Varietas Dihapus) */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1C241E]">
                    Spesifikasi &amp; Estimasi Bobot
                  </h2>
                  <p className="text-xs text-[#7A827C]">
                    Masukkan estimasi berat panen dan titik muat untuk penjemputan armada truk tengkulak.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Estimasi Berat / Volume */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Estimasi Berat / Volume Hasil Panen
                  </label>
                  <div className="flex items-center rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white overflow-hidden transition-colors">
                    <input
                      type="number"
                      min={500}
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                      className="w-full bg-transparent px-3.5 py-2.5 text-sm font-bold text-[#1C241E] outline-none"
                    />
                    <span className="px-3 py-1.5 mr-1.5 rounded-lg bg-[#EAE6DC] text-xs font-semibold text-[#5C635E] shrink-0">
                      {activeCommodity.unit.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7A827C]">
                    <span>
                      Setara dengan: <strong className="text-[#1C241E]">{tonEquivalent} Ton</strong>
                    </span>
                    <span>Min. jual: 500 {activeCommodity.unit}</span>
                  </div>
                </div>

                {/* Tanggal Siap Timbang & Muat */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Tanggal Siap Timbang &amp; Muat
                  </label>
                  <div className="relative flex items-center rounded-xl bg-[#F5F2EB] px-3.5 py-2.5">
                    <input
                      type="date"
                      value={readyDate}
                      onChange={(e) => setReadyDate(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-[#1C241E] outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#7A827C]">
                    Pengepul akan menjemput sesuai jendela tanggal ini.
                  </p>
                </div>

                {/* Titik Muat / Lokasi Gudang Tani */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Titik Muat / Lokasi Gudang Tani
                  </label>
                  <div className="flex items-center rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white px-3.5 py-2.5 transition-colors">
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-[#1C241E] outline-none"
                    />
                    <MapPin className="w-4 h-4 text-[#5C635E] shrink-0 ml-2" />
                  </div>
                  <p className="text-[11px] text-[#7A827C]">
                    Radius jemput bebas biaya transport untuk radius &lt; 25 km dari titik pangkalan tengkulak.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Ekspektasi Harga & Kualitas Panen (Default Harga Rata-Rata SP2KP) */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1C241E]">
                    Ekspektasi Harga &amp; Kualitas Panen
                  </h2>
                  <p className="text-xs text-[#7A827C]">
                    Harga otomatis diisi sesuai harga rata-rata acuan SP2KP Kemendag RI. Anda dapat menyesuaikannya bila perlu.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Harga Harapan Petani per {activeCommodity.unit.toUpperCase()}
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpectedPrice(activeCommodity.averagePrice)}
                    className="text-[11px] font-semibold text-[#156E33] hover:underline cursor-pointer"
                  >
                    Reset ke Rata-rata SP2KP (Rp {formatRupiah(activeCommodity.averagePrice)})
                  </button>
                </div>

                <div className="flex items-center rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white px-3.5 py-2.5 transition-colors">
                  <span className="text-sm font-bold text-[#1C241E] mr-2">Rp</span>
                  <input
                    type="number"
                    value={expectedPrice}
                    onChange={(e) => setExpectedPrice(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold text-[#1C241E] outline-none"
                  />
                  <span className="text-xs font-medium text-[#7A827C] ml-2">/ {activeCommodity.unit}</span>
                </div>

                <p className="flex items-center gap-1.5 text-xs text-[#5C635E] pt-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#156E33]" />
                  Rekomendasi pasar SP2KP hari ini:{' '}
                  <strong className="text-[#156E33]">
                    Rp {formatRupiah(activeCommodity.minPrice)} – Rp{' '}
                    {formatRupiah(activeCommodity.maxPrice)} / {activeCommodity.unit}
                  </strong>
                  <span className="text-[11px] text-[#7A827C]">
                    (Rata-rata: Rp {formatRupiah(activeCommodity.averagePrice)})
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Foto Sampel Panen */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Foto Sampel Panen (Opsional)
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[#ECE8DF] bg-[#FAF8F4]">
                    <div className="w-14 h-14 rounded-lg bg-[#D8C39E] overflow-hidden shrink-0 flex items-center justify-center text-[#6B532C]">
                      {samplePreviewUrl ? (
                        <img
                          src={samplePreviewUrl}
                          alt="Sampel panen"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1C241E] truncate">
                        {sampleFile ? sampleFile.name : 'sampel_hasil_panen.jpg'}
                      </p>
                      <p className="text-[11px] text-[#7A827C]">
                        {sampleFile
                          ? `${(sampleFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah`
                          : 'Format JPG, PNG, WEBP max 5MB'}
                      </p>
                      <button
                        type="button"
                        onClick={() => sampleInputRef.current?.click()}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#156E33] hover:underline cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" />
                        {sampleFile ? 'Ganti Foto' : 'Pilih Foto'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Catatan Kualitas Tambahan */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Catatan Kualitas Tambahan
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`Misal: Komoditas ${activeCommodity.name} panen segar, kadar air rendah, bersih siap angkut.`}
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white p-3 text-xs text-[#1C241E] placeholder:text-[#9AA19C] outline-none resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button & Disclaimer */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePublishHarvest}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-[#156E33] hover:bg-[#105728] active:scale-[0.995] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? 'Mempublikasikan...' : 'Publikasikan Penjualan Panen'}
              </button>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F4F1EA] text-xs text-[#5C635E]">
                <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0 mt-0.5" />
                <p>
                  Dengan mempublikasikan, Anda sepakat dengan standar timbangan digital transparan Tandur dan batas toleransi harga wajar berbasis SP2KP Kemendag RI.
                </p>
              </div>
            </div>
          </div>

          {/* Right Summary Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            {/* Estimasi Pendapatan Kotor */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A827C]">
                  ESTIMASI PENDAPATAN KOTOR
                </span>
                <span className="w-2 h-2 rounded-full bg-[#156E33]" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#1C241E]">
                Rp {formatRupiah(grossRevenue)}
              </p>
              <p className="text-xs text-[#7A827C]">
                {formatRupiah(weightKg)} {activeCommodity.unit} × Rp {formatRupiah(expectedPrice)} / {activeCommodity.unit}
              </p>
            </div>

            {/* Pasar Hari Ini (Acuan SP2KP) */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#156E33]" />
                  <h3 className="text-sm font-bold text-[#1C241E]">Acuan Pasar SP2KP</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#F2EFE9] text-[10px] font-medium text-[#5C635E]">
                  Kemendag RI
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-[#1C241E]">{activeCommodity.name}</p>
                <p className="text-[11px] text-[#7A827C]">{lastRefreshedAt}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[11px] text-[#7A827C]">Terendah (-15%)</p>
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">
                    Rp {formatRupiah(activeCommodity.minPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Rata-rata SP2KP</p>
                  <p className="text-xs font-bold text-[#156E33] mt-0.5">
                    Rp {formatRupiah(activeCommodity.averagePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Tertinggi (+15%)</p>
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">
                    Rp {formatRupiah(activeCommodity.maxPrice)}
                  </p>
                </div>
              </div>

              {/* Progress Price Indicator Bar */}
              <div className="space-y-1.5">
                <div className="relative h-2 w-full rounded-full bg-[#EFECE6]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      priceDiffPercentage > 15
                        ? 'bg-[#C84126]'
                        : priceDiffPercentage < -15
                        ? 'bg-[#E5A534]'
                        : 'bg-[#156E33]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          50 + (priceDiffPercentage / 30) * 50
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#7A827C]">
                  <span>Batas Bawah</span>
                  <span className="font-semibold text-[#156E33]">Rata-rata</span>
                  <span>Batas Atas</span>
                </div>
              </div>

              <p className="text-xs text-[#5C635E] leading-relaxed">
                {priceDiffPercentage === 0 ? (
                  <>
                    Harga penawaran Anda (
                    <strong className="text-[#156E33]">Rp {formatRupiah(expectedPrice)}</strong>) persis sama dengan rata-rata pasar SP2KP.
                  </>
                ) : priceDiffPercentage < 0 ? (
                  <>
                    Harga penawaran Anda (
                    <strong className="text-[#156E33]">Rp {formatRupiah(expectedPrice)}</strong>) berada{' '}
                    <strong>{Math.abs(priceDiffPercentage).toFixed(1)}% di bawah</strong> rata-rata SP2KP, berpeluang sangat cepat diserap tengkulak.
                  </>
                ) : priceDiffPercentage <= 15 ? (
                  <>
                    Harga penawaran Anda (
                    <strong className="text-[#1C241E]">Rp {formatRupiah(expectedPrice)}</strong>) berada{' '}
                    <strong>{priceDiffPercentage.toFixed(1)}% di atas</strong> rata-rata SP2KP, masih dalam batas toleransi wajar.
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[#C84126] font-semibold">
                      <BadgeAlert className="w-3.5 h-3.5" /> Harga di atas rekomendasi
                    </span>
                    <br />
                    Penawaran Anda melebihi toleransi wajar (+15%) pasar SP2KP.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
