import React, { useState } from 'react';
import {
  Handshake,
  Search,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  FileBadge,
  Scale,
} from 'lucide-react';

interface NegotiationItem {
  id: string;
  initials: string;
  initialsBg: string;
  initialsText: string;
  farmerName: string;
  status: 'Aktif Berjalan' | 'Menunggu Respon';
  contractCode: string;
  village: string;
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

const NEGOTIATION_LIST: NegotiationItem[] = [
  {
    id: 'neg-1',
    initials: 'SM',
    initialsBg: 'bg-[#DFF2E3]',
    initialsText: 'text-[#236B37]',
    farmerName: 'Gapoktan Sumber Makmur',
    status: 'Aktif Berjalan',
    contractCode: '#KSP-DMK-042',
    village: 'Desa Karangawen, Kec. Karangawen',
    totalLabel: 'Total Nilai Kesepakatan',
    totalValue: 'Rp. 67.500.000',
    col1Label: 'Komoditas & Varietas',
    col1Title: 'GKP Ciherang',
    col1Sub: '10.0 Ton (10.000/kg)',
    col2Label: 'Harga Deal Tebas',
    col2Price: 'Rp 6.750',
    col2Sub: 'Ref. Pasar Rp 6.800',
    col3Label: 'Periode Panen / Ambil',
    col3Title: '28 Okt - 01 Nov',
    col3Sub: 'Blok Banten Sawah',
    col4Label: 'Metode Bayar & Angkut',
    col4Title: 'Tunai Lapangan',
    col4Sub: 'Truk CDD 01 Mandiri',
  },
  {
    id: 'neg-2',
    initials: 'TM',
    initialsBg: 'bg-[#F8EFE2]',
    initialsText: 'text-[#8A5A19]',
    farmerName: 'Poktan Tani Mulyo',
    status: 'Menunggu Respon',
    contractCode: '#KSP-DMK-045',
    village: 'Desa Bumirejo, Kec. Guntur',
    totalLabel: 'Estimasi Nilai Tebas',
    totalValue: 'Rp 66.300.000',
    col1Label: 'Komoditas & Varietas',
    col1Title: 'GKG Inpari 32',
    col1Sub: '8.5 Ton (8.500 kg)',
    col2Label: 'Harga Penawaran Anda',
    col2Price: 'Rp 7.800',
    col2Sub: 'Petani tawar Rp 7.950',
    col3Label: 'Batas Waktu Respon',
    col3Title: 'Hari Ini, 18:00',
    col3Sub: 'Sisa waktu 4 jam 20 mnt',
    col4Label: 'Status Verifikasi',
    col4Title: 'Petani Poktan',
    col4Sub: 'Menunggu musyawarah',
    showAcceptButton: true,
  },
  {
    id: 'neg-3',
    initials: 'IS',
    initialsBg: 'bg-[#F8EFE2]',
    initialsText: 'text-[#8A5A19]',
    farmerName: 'Petani Mandiri - Ibu Suparni',
    status: 'Aktif Berjalan',
    contractCode: '#KSP-DMK-039',
    village: 'Dukuh Godoh, Kec. Karangawen',
    totalLabel: 'Total Nilai Kesepakatan',
    totalValue: 'Rp. 46.200.000',
    col1Label: 'Komoditas & Kemasan',
    col1Title: 'Mentik Wangi Sak 50kg',
    col1Sub: '3.5 Ton (70 Sak)',
    col2Label: 'Harga Deal Tebas',
    col2Price: 'Rp 13.200',
    col2Sub: 'Ref. Grosir Rp 13.500',
    col3Label: 'Periode Serah Terima',
    col3Title: '30 Okt 2025',
    col3Sub: 'Gudang Rice Mill Guntur',
    col4Label: 'Verifikasi Tera',
    col4Title: 'Sudah Tervalidasi',
    col4Sub: 'Timbangan Digital Akurasi',
  },
  {
    id: 'neg-4',
    initials: 'SA',
    initialsBg: 'bg-[#F3EFE6]',
    initialsText: 'text-[#5C645C]',
    farmerName: 'Poktan Subur Asri',
    status: 'Menunggu Respon',
    contractCode: '#KSP-DMK-048',
    village: 'Desa Gebangarum, Kec. Bonang',
    totalLabel: 'Total Estimasi',
    totalValue: 'Rp. 30.600.000',
    col1Label: 'Komoditas & Varietas',
    col1Title: 'Jagung Pipil',
    col1Sub: '6.0 Ton (KA 15%)',
    col2Label: 'Harga Penawaran',
    col2Price: 'Rp 5.100',
    col2Sub: 'Ref. Pasar Rp 5.200',
    col3Label: 'Estimasi Jadwal Panen',
    col3Title: '04 - 06 Nov 2025',
    col3Sub: '',
    showAcceptButton: true,
  },
];

export const PriceNegotiationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Semua Kesepakatan');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tabs = [
    { label: 'Semua Kesepakatan', count: 11 },
    { label: 'Aktif Berjalan', count: 8 },
    { label: 'Menunggu Respon', count: 3 },
    { label: 'Selesai Panen', count: 24 },
    { label: 'Dibatalkan', count: 1 },
  ];

  const filteredItems = NEGOTIATION_LIST.filter((item) => {
    const matchTab =
      activeTab === 'Semua Kesepakatan' || item.status === activeTab;
    const matchSearch =
      item.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contractCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.village.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#8A5A19]">
            <Handshake className="w-4 h-4" />
            NEGOSIASI & KONTRAK HARGA PANEN
          </div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1A201A]">
            Penawaran & Kesepakatan Harga
          </h1>
          <p className="text-xs sm:text-sm text-[#6D756D] max-w-2xl leading-relaxed">
            Kelola penawaran & kesepakatan harga tebas sawah dengan petani, pantau tren penawaran masuk, dan catat komitmen harga panen bergaransi resmi.
          </p>
        </div>

        {/* Search & Filter Container */}
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
              <span>Komoditas:</span>
              <strong className="text-[#1A201A]">Semua Komoditas</strong>
            </div>

            <div className="md:col-span-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs text-[#6D756D]">
              <MapPin className="w-4 h-4 text-[#8A5A19] shrink-0" />
              <span>Kecamatan:</span>
              <strong className="text-[#1A201A]">Semua Wilayah</strong>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
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

        {/* Negotiation Cards List */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
            >
              {/* Card Header */}
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

              {/* Inner Detail Grid */}
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

              {/* Action Button if Menunggu Respon */}
              {item.showAcceptButton && (
                <div>
                  <button className="px-5 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer">
                    Terima Tawaran
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Legal Footer Banner */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A201A]">
                Jaminan Legalitas & Kepatuhan Tera Tandur
              </h3>
              <p className="text-xs text-[#6D756D] mt-0.5 leading-relaxed">
                Setiap kesepakatan harga tebas dilindungi standar nota kesepakatan bermaterai elektronik dan tervalidasi sertifikasi tera metrologi Dinas Pertanian dan Perdagangan Kabupaten Demak.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#2D332D]">
              <FileBadge className="w-3.5 h-3.5 text-[#8A5A19]" />
              Perda No. 12/2023 Demak
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#2D332D]">
              <Scale className="w-3.5 h-3.5 text-[#236B37]" />
              Tera Sah 2025
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceNegotiationPage;