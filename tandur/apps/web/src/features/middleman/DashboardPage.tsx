import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { fetchApi, type Commodity } from '@/services/api';

interface DashboardPageProps {
  onNavigate?: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const initialHarvestPrices = [
    {
      name: 'GKP Ciherang',
      desc: 'Gabah Kering Panen sawah',
      price: 'Rp 6.800',
      trend: 'stabil',
      trendLabel: '— Stabil',
    },
    {
      name: 'GKG Inpari 32',
      desc: 'Gabah Kering Giling siap slip',
      price: 'Rp 7.900',
      trend: 'up',
      trendLabel: '+Rp 100',
    },
    {
      name: 'Beras Putih Medium',
      desc: 'Kemasan karung 50kg',
      price: 'Rp 12.800',
      trend: 'stabil',
      trendLabel: '— Stabil',
    },
    {
      name: 'Jagung Pipil Kering',
      desc: 'Kadar Air 15% (Pakan Ternak)',
      price: 'Rp 5.200',
      trend: 'stabil',
      trendLabel: '— Stabil',
    },
  ];

  const [harvestPrices, setHarvestPrices] = useState(initialHarvestPrices);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const displayName = storedUser?.name || 'Haji Supardi';

  useEffect(() => {
    let isMounted = true;
    async function loadPrices() {
      try {
        const res = await fetchApi<{ data?: Commodity[] } | Commodity[]>('/commodities');
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];

        if (isMounted && list.length > 0) {
          const mapped = list.slice(0, 4).map((c: any) => ({
            name: c.name,
            desc: `Standar ${c.category || 'Komoditas Pasar'}`,
            price: `Rp ${(c.current_market_price || c.base_price || 0).toLocaleString('id-ID')}`,
            trend: (c.current_market_price > c.base_price ? 'up' : 'stabil') as 'up' | 'stabil',
            trendLabel:
              c.current_market_price > c.base_price
                ? `+Rp ${(c.current_market_price - c.base_price).toLocaleString('id-ID')}`
                : '— Stabil',
          }));
          setHarvestPrices(mapped);
        }
      } catch {
        // Fallback aman tetap menggunakan default
      }
    }
    loadPrices();
    return () => {
      isMounted = false;
    };
  }, []);

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
                Musim Panen Gadu • Pantauan Aktif
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A201A] tracking-tight">
                Selamat Pagi, {displayName}
              </h1>
              <p className="text-sm text-[#5C645C] leading-relaxed">
                Ringkasan pengadaan komoditas dan jadwal timbang gabah wilayah Demak & sekitarnya terkelola secara real-time.
              </p>
            </div>

            <button
              onClick={() => onNavigate?.('/cari-pasokan')}
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
              <div className="text-2xl font-extrabold text-[#1A201A]">3 Kontrak</div>
              <div className="mt-1.5 flex items-center gap-2 text-xs font-medium">
                <span className="text-[#236B37] font-semibold">2 Siap Timbang</span>
                <span className="text-[#9AA19A]">•</span>
                <span className="text-[#6D756D]">1 Menuju Gudang</span>
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
              <div className="text-2xl font-extrabold text-[#1A201A]">18.5 Ton</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
                <span className="text-[#8A5A19] font-semibold">GKP Ciherang</span>
                <span className="text-[#6D756D]">& Beras Organik</span>
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
              <div className="text-2xl font-extrabold text-[#1A201A]">Besok, 08:30</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
                <span className="text-[#8A5A19] font-semibold">Karangawen</span>
                <span className="text-[#9AA19A]">•</span>
                <span className="text-[#6D756D]">5.0 Ton GKP</span>
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
              <div className="text-2xl font-extrabold text-[#1A201A]">14 Poktan</div>
              <div className="mt-1.5 text-xs text-[#6D756D]">
                Wilayah <span className="font-semibold text-[#1A201A]">Demak & Grobogan</span>
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
                  Jadwal Muat & Timbang Lapangan
                </h2>
                <p className="text-xs sm:text-sm text-[#6D756D] mt-0.5">
                  Logistik armada dan alokasi petani tani minggu ini
                </p>
              </div>
              <span className="self-start px-3 py-1 rounded-full bg-[#F3EFE6] text-[#6E5636] text-xs font-semibold">
                2 Armada Terjadwal
              </span>
            </div>

            {/* Schedule Item 1 */}
            <div className="bg-[#F6F2EA] rounded-xl p-4 sm:p-5 border border-[#EDE6D8] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5DEC9] text-[11px] font-bold text-[#2D332D]">
                  CDD • H 8421 BE
                </span>
                <span className="px-3 py-1 rounded-full bg-[#DCF1E1] text-[#1E6632] text-xs font-semibold">
                  Surat Jalan Terbit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div>
                  <div className="font-bold text-sm sm:text-base text-[#1A201A]">
                    Sugeng Santoso
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                    KOMODITAS & ESTIMASI
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#236B37] mt-0.5">
                    5.0 Ton GKP
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                    WAKTU & TITIK MUAT
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1A201A] mt-0.5">
                    Besok, 08:30 WIB
                  </div>
                  <div className="text-xs text-[#6D756D]">Sawah Karangawen Blok B</div>
                </div>
              </div>
            </div>

            {/* Schedule Item 2 */}
            <div className="bg-[#F6F2EA] rounded-xl p-4 sm:p-5 border border-[#EDE6D8] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5DEC9] text-[11px] font-bold text-[#2D332D]">
                  Engkel • H 9102 CF
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F5E6CD] text-[#8A5A19] text-xs font-semibold">
                  Konfirmasi Jadwal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div>
                  <div className="font-bold text-sm sm:text-base text-[#1A201A]">
                    Ibu Suparni
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                    KOMODITAS & ESTIMASI
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#236B37] mt-0.5">
                    3.5 Ton Beras
                  </div>
                  <div className="text-xs text-[#6D756D]">Kemasan Karung 50kg</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A827A]">
                    WAKTU & TITIK MUAT
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1A201A] mt-0.5">
                    Lusa, 10:00 WIB
                  </div>
                  <div className="text-xs text-[#6D756D]">Gudang Rice Mill Guntur</div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button className="inline-flex items-center gap-2 bg-[#8A5A19] hover:bg-[#734A13] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                  <Calendar className="w-3.5 h-3.5" />
                  Konfirmasi Slot
                </button>
              </div>
            </div>

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
                  Rujukan Pasar Tingkat Penggilingan Demak
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A5A19] shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Hari ini</span>
              </div>
            </div>

            {/* Price Items */}
            <div className="space-y-3">
              {harvestPrices.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#F6F2EA] rounded-xl px-4 py-3.5 border border-[#EDE6D8] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-[#1A201A]">{item.name}</div>
                    <div className="text-xs text-[#6D756D] mt-0.5">{item.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold">
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

            {/* Trend Footer Banner */}
            <div className="bg-[#F4EFE6] rounded-xl px-4 py-3 border border-[#E8E0D1] flex items-center gap-2.5 text-xs text-[#4C544C]">
              <TrendingUp className="w-4 h-4 text-[#8A5A19] shrink-0" />
              <span>Tren pasokan panen Demak minggu ini meningkat +12%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;