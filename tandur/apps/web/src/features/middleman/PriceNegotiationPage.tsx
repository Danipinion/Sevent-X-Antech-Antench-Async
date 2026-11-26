import React, { useState, useEffect, useMemo } from 'react';
import {
  Handshake,
  Search,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  FileBadge,
  Scale,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { MiddlemanApi, type NegotiationOffer } from '@/services/api';

interface NegotiationViewItem {
  id: string;
  initials: string;
  initialsBg: string;
  initialsText: string;
  farmerName: string;
  status: 'Aktif Berjalan' | 'Menunggu Respon';
  contractCode: string;
  village: string;
  commodityName: string;
  totalLabel: string;
  totalValue: string;
  col1Label: string;
  col1Title: string;
  col1Sub: string;
  col2Label: string;
  col2Price: string;
  col2Sub: string;
  col3Label: string;
  col3Title: string;
  col3Sub: string;
  col4Label?: string;
  col4Title?: string;
  col4Sub?: string;
  showAcceptButton?: boolean;
}

const LOCAL_ORDERS_KEY = 'tandur_local_po_orders';

const getInitials = (name: string): string => {
  const parts = (name || 'PT').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatRupiah = (amount: number): string => {
  return 'Rp ' + (Number(amount) || 0).toLocaleString('id-ID');
};

export const PriceNegotiationPage: React.FC = () => {
  const [negotiations, setNegotiations] = useState<NegotiationViewItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Semua Kesepakatan');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('Semua Komoditas');
  const [selectedRegion, setSelectedRegion] = useState<string>('Semua Wilayah');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const mapOfferToViewItem = (offer: any, idx: number): NegotiationViewItem => {
    const isActive =
      offer.status === 'active' ||
      offer.status === 'scheduled' ||
      offer.status === 'completed' ||
      offer.status === 'Aktif Berjalan';

    const weightKg = Number(offer.weight_kg ?? offer.offered_quantity ?? offer.quantity ?? 0);
    const weightTons = (weightKg / 1000).toFixed(1);
    const offeredPrice = Number(
      offer.offered_price ?? offer.price_per_kg ?? offer.price_per_unit ?? 0
    );
    const marketRef = Number(offer.market_ref_price ?? offer.benchmark_price ?? offeredPrice);
    const totalAmount = Number(
      offer.total_price ?? offer.total_offered_price ?? weightKg * offeredPrice
    );
    const farmerName = offer.farmer_name || 'Petani Mitra Tandur';
    const commodityName = offer.commodity_name || 'Komoditas Panen';
    const village = offer.village || offer.pickup_address || 'Wilayah Mitra Tandur';

    const badgeThemes = [
      { bg: 'bg-[#DFF2E3]', text: 'text-[#236B37]' },
      { bg: 'bg-[#F8EFE2]', text: 'text-[#8A5A19]' },
      { bg: 'bg-[#F3EFE6]', text: 'text-[#5C645C]' },
    ];
    const theme = isActive ? badgeThemes[0] : badgeThemes[(idx % 2) + 1];

    return {
      id: String(offer.id || `neg-${idx}`),
      initials: getInitials(farmerName),
      initialsBg: theme.bg,
      initialsText: theme.text,
      farmerName,
      status: isActive ? 'Aktif Berjalan' : 'Menunggu Respon',
      contractCode: offer.contract_code || offer.order_code || `#${offer.id}`,
      village,
      commodityName,
      totalLabel: isActive ? 'Total Nilai Kesepakatan' : 'Estimasi Nilai Penawaran',
      totalValue: formatRupiah(totalAmount),
      col1Label: 'Komoditas & Volume',
      col1Title: commodityName,
      col1Sub: `${weightTons} Ton (${weightKg.toLocaleString('id-ID')} kg)`,
      col2Label: isActive ? 'Harga Deal Kesepakatan' : 'Harga Penawaran Anda',
      col2Price: formatRupiah(offeredPrice),
      col2Sub:
        offer.counter_price && Number(offer.counter_price) > 0
          ? `Petani tawar ${formatRupiah(Number(offer.counter_price))}`
          : `Ref. Pasar ${formatRupiah(marketRef)}`,
      col3Label: isActive ? 'Jadwal Pengambilan' : 'Target Tanggal Muat',
      col3Title: offer.harvest_period || offer.pickup_date || 'Sesuai Kesepakatan',
      col3Sub: offer.pickup_time_slot || '',
      col4Label: 'Metode & Keterangan',
      col4Title: offer.payment_method || 'Timbang Digital Tandur',
      col4Sub: offer.notes || (isActive ? 'Kontrak Terverifikasi' : 'Menunggu konfirmasi'),
      showAcceptButton: !isActive,
    };
  };

  const loadNegotiations = async () => {
    setIsLoading(true);
    try {
      let apiList: NegotiationOffer[] = [];
      try {
        const res = await MiddlemanApi.getNegotiations();
        const raw = (res as any)?.data?.items ?? (res as any)?.data ?? res;
        if (Array.isArray(raw)) {
          apiList = raw;
        }
      } catch {
        // Fallback aman jika endpoint negosiasi kosong/error
      }

      // Gabungkan juga data PO lokal jika ada agar tetap tampil tanpa dummy
      let localList: any[] = [];
      try {
        const rawLocal = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
        if (Array.isArray(rawLocal)) {
          localList = rawLocal;
        }
      } catch {
        // abaikan parse error
      }

      const combined = [...apiList, ...localList];
      setNegotiations(combined.map((item, idx) => mapOfferToViewItem(item, idx)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNegotiations();
  }, []);

  const handleAcceptOffer = async (id: string, farmerName: string) => {
    if (acceptingId) return;
    setAcceptingId(id);
    try {
      try {
        await MiddlemanApi.acceptNegotiation(id);
      } catch {
        // Update status lokal jika item berasal dari localStorage
        const rawLocal = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
        if (Array.isArray(rawLocal)) {
          const updatedLocal = rawLocal.map((o: any) =>
            String(o.id) === id ? { ...o, status: 'scheduled' } : o
          );
          localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedLocal));
        }
      }

      setNegotiations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'Aktif Berjalan',
                initialsBg: 'bg-[#DFF2E3]',
                initialsText: 'text-[#236B37]',
                totalLabel: 'Total Nilai Kesepakatan',
                col2Label: 'Harga Deal Kesepakatan',
                showAcceptButton: false,
              }
            : item
        )
      );

      await Swal.fire({
        icon: 'success',
        title: 'Kesepakatan Harga Disetujui',
        text: `Kontrak harga dengan ${farmerName} kini berstatus Aktif Berjalan.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } finally {
      setAcceptingId(null);
    }
  };

  const commodityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(negotiations.map((n) => n.commodityName).filter(Boolean))
    );
    return ['Semua Komoditas', ...unique];
  }, [negotiations]);

  const regionOptions = useMemo(() => {
    const unique = Array.from(new Set(negotiations.map((n) => n.village).filter(Boolean)));
    return ['Semua Wilayah', ...unique];
  }, [negotiations]);

  const tabs = [
    { label: 'Semua Kesepakatan', count: negotiations.length },
    {
      label: 'Aktif Berjalan',
      count: negotiations.filter((i) => i.status === 'Aktif Berjalan').length,
    },
    {
      label: 'Menunggu Respon',
      count: negotiations.filter((i) => i.status === 'Menunggu Respon').length,
    },
  ];

  const filteredItems = negotiations.filter((item) => {
    const matchTab = activeTab === 'Semua Kesepakatan' || item.status === activeTab;
    const matchCommodity =
      selectedCommodity === 'Semua Komoditas' || item.commodityName === selectedCommodity;
    const matchRegion =
      selectedRegion === 'Semua Wilayah' || item.village === selectedRegion;
    const matchSearch =
      item.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contractCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.commodityName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchCommodity && matchRegion && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#8A5A19]">
              <Handshake className="w-4 h-4" />
              NEGOSIASI &amp; KONTRAK HARGA PANEN
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1A201A]">
              Penawaran &amp; Kesepakatan Harga
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-2xl leading-relaxed">
              Kelola penawaran &amp; kesepakatan harga tebas sawah dengan petani, pantau tren penawaran masuk, dan catat komitmen harga panen bergaransi resmi.
            </p>
          </div>

          <button
            type="button"
            onClick={loadNegotiations}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs font-semibold text-[#1A201A] transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#236B37] ${isLoading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#8E968E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama petani, kelompok tani, desa, atau nomor surat..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:text-sm text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs text-[#6D756D]">
              <LayoutGrid className="w-4 h-4 text-[#236B37] shrink-0" />
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full bg-transparent font-bold text-[#1A201A] outline-none cursor-pointer"
              >
                {commodityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs text-[#6D756D]">
              <MapPin className="w-4 h-4 text-[#8A5A19] shrink-0" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-transparent font-bold text-[#1A201A] outline-none cursor-pointer"
              >
                {regionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#236B37] text-white'
                      : 'bg-[#F4EFE6] text-[#555D55] hover:bg-[#EAE2D3]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 flex flex-col items-center justify-center text-center space-y-2.5">
            <Loader2 className="w-7 h-7 text-[#236B37] animate-spin" />
            <p className="text-sm font-bold text-[#1A201A]">
              Memuat Data Penawaran &amp; Kesepakatan...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 flex flex-col items-center justify-center text-center space-y-2.5">
            <Handshake className="w-9 h-9 text-[#8A5A19]" />
            <h3 className="text-base font-extrabold text-[#1A201A]">
              Belum Ada Penawaran atau Kesepakatan Harga
            </h3>
            <p className="text-xs sm:text-sm text-[#6D756D] max-w-md">
              {searchQuery ||
              selectedCommodity !== 'Semua Komoditas' ||
              selectedRegion !== 'Semua Wilayah'
                ? 'Tidak ditemukan kontrak atau penawaran yang sesuai dengan filter pencarian Anda.'
                : 'Ajukan penawaran borongan melalui menu Cari Petani & Pasokan untuk memulai negosiasi kontrak panen.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.initialsBg} ${item.initialsText} font-extrabold text-sm flex items-center justify-center shrink-0`}
                    >
                      {item.initials}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-base font-extrabold text-[#1A201A]">
                          {item.farmerName}
                        </h2>
                        {item.status === 'Aktif Berjalan' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                            Aktif Berjalan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F8E7CD] text-[#8A5A19] text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8A5A19]" />
                            Menunggu Respon
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-[#236B37]">{item.contractCode}</span>
                        <span className="text-[#8E968E]">• {item.village}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[11px] text-[#6D756D]">{item.totalLabel}</div>
                    <div className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
                      {item.totalValue}
                    </div>
                  </div>
                </div>

                <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[11px] text-[#7A827A]">{item.col1Label}</div>
                    <div className="text-xs sm:text-sm font-bold text-[#1A201A] mt-0.5">
                      {item.col1Title}
                    </div>
                    <div className="text-xs text-[#6D756D]">{item.col1Sub}</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#7A827A]">{item.col2Label}</div>
                    <div className="text-xs sm:text-sm font-extrabold text-[#236B37] mt-0.5">
                      {item.col2Price}{' '}
                      <span className="text-[11px] font-normal text-[#7A827A]">/ kg</span>
                    </div>
                    <div
                      className={`text-xs ${
                        item.col2Sub.includes('tawar')
                          ? 'text-[#8A5A19] font-semibold'
                          : 'text-[#6D756D]'
                      }`}
                    >
                      {item.col2Sub}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#7A827A]">{item.col3Label}</div>
                    <div
                      className={`text-xs sm:text-sm font-bold mt-0.5 ${
                        item.col3Title.includes('Hari Ini')
                          ? 'text-[#8A5A19]'
                          : 'text-[#1A201A]'
                      }`}
                    >
                      {item.col3Title}
                    </div>
                    {item.col3Sub && (
                      <div className="text-xs text-[#6D756D]">{item.col3Sub}</div>
                    )}
                  </div>

                  {item.col4Label && (
                    <div>
                      <div className="text-[11px] text-[#7A827A]">{item.col4Label}</div>
                      <div className="text-xs sm:text-sm font-bold text-[#1A201A] mt-0.5">
                        {item.col4Title}
                      </div>
                      <div className="text-xs text-[#6D756D]">{item.col4Sub}</div>
                    </div>
                  )}
                </div>

                {item.showAcceptButton && (
                  <div>
                    <button
                      type="button"
                      disabled={acceptingId === item.id}
                      onClick={() => handleAcceptOffer(item.id, item.farmerName)}
                      className="px-5 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {acceptingId === item.id ? 'Memproses...' : 'Terima Tawaran'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Legalitas */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A201A]">
                Jaminan Legalitas &amp; Kepatuhan Tera Tandur
              </h3>
              <p className="text-xs text-[#6D756D] mt-0.5 leading-relaxed">
                Setiap kesepakatan harga tebas dilindungi standar nota kesepakatan bermaterai elektronik dan tervalidasi sertifikasi tera metrologi Dinas Pertanian dan Perdagangan setempat.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#2D332D]">
              <FileBadge className="w-3.5 h-3.5 text-[#8A5A19]" />
              Nota Kesepakatan Resmi
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#2D332D]">
              <Scale className="w-3.5 h-3.5 text-[#236B37]" />
              Tera Digital Sah
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceNegotiationPage;