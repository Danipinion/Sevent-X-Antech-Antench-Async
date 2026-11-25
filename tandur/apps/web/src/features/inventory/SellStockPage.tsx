import React, { useState } from 'react';
import {
  Truck,
  FileText,
  Plus,
  ClipboardCheck,
  Warehouse,
  Store,
  Building2,
  Handshake,
  AlertCircle,
  TrendingUp,
  Scale,
  Sprout,
  LayoutGrid,
  Home,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import { OpenSellOfferModal } from './OpenSellOfferModal';

export const SellStockPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<'Semua' | 'Gabah' | 'Beras' | 'Palawija'>('Semua');
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#FAF8F3] p-4 sm:p-6 lg:p-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFE6] text-[#7D5318] text-[11px] font-bold uppercase tracking-wide">
              <Truck className="w-3.5 h-3.5" />
              DISTRIBUSI & PENJUALAN STOK GUDANG
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1A201A]">
              Jual Stok Gudang
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Buka listing penjualan komoditas gabah dan beras dari gudang/silo Anda ke pembeli grosir, pabrik penggilingan padi (rice mill), dan mitra pasar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#DFD8CA] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer">
              <FileText className="w-4 h-4 text-[#8A5A19]" />
              <span>Pesanan Masuk</span>
              <span className="px-2 py-0.5 rounded-md bg-[#236B37] text-white text-[10px] font-bold">
                4 Baru
              </span>
            </button>

            <button
              onClick={() => setIsSellModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Buka Penawaran Baru
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Stok Siap Jual</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#1A201A]">28.0</span>
                <span className="text-sm font-bold text-[#236B37]">Ton</span>
              </div>
              <p className="text-xs font-semibold text-[#8A5A19] mt-1">
                Gabah GKP, GKG, & Beras Sak
              </p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Warehouse className="w-3.5 h-3.5 text-[#236B37] shrink-0" />
              <span>Tersedia di 2 Silo & 1 Gudang</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Listing Penjualan Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#1A201A]">4</span>
                <span className="text-sm font-bold text-[#1A201A]">Komoditas</span>
              </div>
              <p className="text-xs text-[#6D756D] mt-1">2 Gabah Curah, 2 Beras Sak</p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Building2 className="w-3.5 h-3.5 text-[#236B37] shrink-0" />
              <span>Menjangkau 18 Rice Mill terdaftar</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Penawaran Pembeli Masuk</span>
              <div className="w-8 h-8 rounded-lg bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center">
                <Handshake className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#1A201A]">6</span>
                <span className="text-sm font-bold text-[#1A201A]">Tawaran</span>
              </div>
              <p className="text-xs text-[#6D756D] mt-1">
                Total potensi <strong className="text-[#1A201A]">Rp 184.5 Jt</strong>
              </p>
            </div>
            <div className="bg-[#FDF4E7] rounded-xl px-3 py-2 border border-[#F5E1C3] flex items-center gap-2 text-[11px] font-bold text-[#8A5A19]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>2 Perlu Konfirmasi Segera</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#6D756D]">Rata-rata Margin Jual</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#236B37] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-[#236B37]">+Rp 450</span>
                <span className="text-xs text-[#6D756D]">/ kg</span>
              </div>
              <p className="text-xs font-semibold text-[#236B37] mt-1">
                +6.4% di atas harga tebas rata-rata
              </p>
            </div>
            <div className="bg-[#FAF8F3] rounded-xl px-3 py-2 border border-[#EFEAE0] flex items-center gap-2 text-[11px] text-[#555D55]">
              <Scale className="w-3.5 h-3.5 text-[#6D756D] shrink-0" />
              <span>Berdasarkan 8 transaksi bulan ini</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#1A201A]">
              Stok Komoditas Siap Ditawarkan
            </h2>
            <p className="text-xs text-[#6D756D]">
              Kelola kuota tonase, harga dasar jual, dan status listing pasar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'Semua', label: 'Semua Stok (4)' },
                { key: 'Gabah', label: 'Gabah Curah (2)' },
                { key: 'Beras', label: 'Beras Kemasan (1)' },
                { key: 'Palawija', label: 'Palawija (1)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedFilter === tab.key
                    ? 'bg-[#236B37] text-white'
                    : 'bg-[#F4EFE6] text-[#555D55] hover:bg-[#EAE2D3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Commodity Listing Cards */}
        <div className="space-y-4">
          {/* Card 1: GKP */}
          {(selectedFilter === 'Semua' || selectedFilter === 'Gabah') && (
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#DFF2E3] text-[#236B37] flex items-center justify-center shrink-0">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#1A201A]">
                        Gabah Kering Panen (GKP)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                        Siap Jual / Melimpah
                      </span>
                    </div>
                    <p className="text-xs mt-1">
                      <span className="font-semibold text-[#8A5A19]">Varietas Ciherang Super</span>{' '}
                      <span className="text-[#7A827A]">• Lot:</span>{' '}
                      <strong className="font-mono text-[#1A201A]">#BATCH-TNDR-0518</strong>
                    </p>
                  </div>
                </div>

                <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F9F4] border border-[#D4E8D8] text-xs font-bold text-[#236B37]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                  Aktif Ditawarkan
                </span>
              </div>

              <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-[#7A827A]">Volume Siap Jual</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">15.0 Ton</div>
                  <div className="text-[11px] text-[#7A827A]">dari 18.5 T (Silo 1 K.awen)</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Modal Tebas Petani</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">
                    Rp 6.800 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] text-[#8A5A19]">Gapoktan Sumber Makmur</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Rekomendasi Pasar</div>
                  <div className="text-base font-extrabold text-[#8A5A19] mt-0.5">
                    Rp 7.200 – 7.350
                  </div>
                  <div className="text-[11px] text-[#7A827A]">Survei Rice Mill Demak</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Harga Buka Jual</div>
                  <div className="text-base font-extrabold text-[#236B37] mt-0.5">
                    Rp 7.250 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#236B37]">
                    +Rp 450/kg (Potensi Rp 6.75 Jt)
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsSellModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer"
                >
                  Ubah Harga Buka
                </button>
                <button
                  onClick={() => setIsSellModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5" />
                  Buka ke Pasar Pembeli
                </button>
              </div>
            </div>
          )}

          {/* Card 2: GKG */}
          {(selectedFilter === 'Semua' || selectedFilter === 'Gabah') && (
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#F5EFE6] text-[#8A5A19] flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#1A201A]">
                        Gabah Kering Giling (GKG)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                        Siap Jual
                      </span>
                    </div>
                    <p className="text-xs mt-1">
                      <span className="font-semibold text-[#8A5A19]">Inpari 32 Siap Giling</span>{' '}
                      <span className="text-[#7A827A]">• Lot:</span>{' '}
                      <strong className="font-mono text-[#1A201A]">#BATCH-TNDR-0492</strong>
                    </p>
                  </div>
                </div>

                <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF3DC] text-xs font-bold text-[#8A5A19]">
                  🔔 2 Rice Mill Menawar
                </span>
              </div>

              <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-[#7A827A]">Volume Siap Jual</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">10.0 Ton</div>
                  <div className="text-[11px] text-[#7A827A]">Silo 2 Karangawen</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Modal Tebas</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">
                    Rp 7.850 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] text-[#8A5A19]">Poktan Sri Rejeki</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Rendemen Giling</div>
                  <div className="text-base font-extrabold text-[#8A5A19] mt-0.5">65.2%</div>
                  <div className="text-[11px] text-[#7A827A]">Uji Sampel Lab Lokal</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Harga Buka Jual</div>
                  <div className="text-base font-extrabold text-[#236B37] mt-0.5">
                    Rp 8.400 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#236B37]">+Rp 550/kg margin</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsSellModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-bold text-[#1A201A] transition-colors cursor-pointer"
                >
                  Kelola Listing
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8A5A19] hover:bg-[#734A13] text-white text-xs font-bold transition-colors cursor-pointer">
                  <Eye className="w-3.5 h-3.5" />
                  Lihat 2 Penawaran (Rp 8.350/kg)
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Beras Putih */}
          {(selectedFilter === 'Semua' || selectedFilter === 'Beras') && (
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#1A201A]">
                        Beras Putih Medium IR-64
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F8E7CD] text-[#8A5A19] text-[11px] font-bold">
                        Stok Terbatas
                      </span>
                    </div>
                    <p className="text-xs mt-1">
                      <span className="font-semibold text-[#8A5A19]">Kemasan Karung 50kg</span>{' '}
                      <span className="text-[#7A827A]">• Lot:</span>{' '}
                      <strong className="font-mono text-[#1A201A]">#BRS-DMK-0104</strong>
                    </p>
                  </div>
                </div>

                <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-bold text-[#6D756D]">
                  • Sisa 64 Sak
                </span>
              </div>

              <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-[#7A827A]">Volume Tersedia</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">3.2 Ton</div>
                  <div className="text-[11px] text-[#7A827A]">Gudang B Blok 1 (64 Sak)</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Modal Bersih</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">
                    Rp 11.200 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] text-[#8A5A19]">Biaya Giling & Kemas inc.</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Target Pembeli</div>
                  <div className="text-base font-extrabold text-[#1A201A] mt-0.5">Grosir Pasar</div>
                  <div className="text-[11px] text-[#7A827A]">Toko Sembako & Agen</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#7A827A]">Harga Jual Grosir</div>
                  <div className="text-base font-extrabold text-[#236B37] mt-0.5">
                    Rp 12.400 <span className="text-xs font-normal text-[#7A827A]">/kg</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#236B37]">
                    +Rp 1.200/kg (Laba Rp 3.84 Jt)
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIsSellModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Jual Semua Stok (3.2 Ton)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up Buka Penawaran Jual Baru */}
      <OpenSellOfferModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onPublish={(data) => console.log('Penawaran baru diterbitkan:', data)}
      />
    </div>
  );
};

export default SellStockPage;