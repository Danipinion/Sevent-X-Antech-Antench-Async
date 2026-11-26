import React, { useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';

interface CommodityOption {
  id: string;
  name: string;
  subtitle: string;
  defaultPrice: number;
  icon: React.ReactNode;
}

export default function SellHarvestPage() {
  const commodities: CommodityOption[] = [
    {
      id: 'gkp',
      name: 'Gabah GKP',
      subtitle: 'Kadar air 20-25%',
      defaultPrice: 7300,
      icon: <Grip className="w-4 h-4" />,
    },
    {
      id: 'gkg',
      name: 'Gabah GKG',
      subtitle: 'Kadar air 13-14%',
      defaultPrice: 8100,
      icon: <Wheat className="w-4 h-4" />,
    },
    {
      id: 'jagung',
      name: 'Jagung Pipil',
      subtitle: 'KA 14-16%',
      defaultPrice: 5600,
      icon: <Sprout className="w-4 h-4" />,
    },
    {
      id: 'kedelai',
      name: 'Kedelai Lokal',
      subtitle: 'Grade A Bersih',
      defaultPrice: 11200,
      icon: <CircleDot className="w-4 h-4" />,
    },
    {
      id: 'cabai',
      name: 'Cabai Rawit',
      subtitle: 'Petik Segar',
      defaultPrice: 32000,
      icon: <Flame className="w-4 h-4" />,
    },
    {
      id: 'bawang',
      name: 'Bawang Merah',
      subtitle: 'Askip Kering',
      defaultPrice: 24500,
      icon: <CircleDot className="w-4 h-4" />,
    },
  ];

  const [selectedCommodity, setSelectedCommodity] = useState<string>('gkp');
  const [variety, setVariety] = useState<string>('Inpari 32 (Standar Bulir Sedang)');
  const [weightKg, setWeightKg] = useState<number>(8500);
  const [readyDate, setReadyDate] = useState<string>('2025-02-03');
  const [pickupLocation, setPickupLocation] = useState<string>('Sukamaju, Ngawi');
  const [expectedPrice, setExpectedPrice] = useState<number>(7300);
  const [notes, setNotes] = useState<string>('');

  const grossRevenue = weightKg * expectedPrice;
  const tonEquivalent = (weightKg / 1000).toFixed(1).replace('.', ',');

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 lg:p-8 text-[#1C241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title Section */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#E8F5EC] text-[#156E33] text-xs font-semibold">
            <Store className="w-3.5 h-3.5" />
            Kanal Penjualan Langsung Petani
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C241E]">
            Jual Hasil Panen &amp; Dapatkan Penawaran Terbaik
          </h1>
          <p className="text-sm text-[#5C635E] max-w-3xl leading-relaxed">
            Publikasikan hasil panen Anda ke 1.200+ tengkulak &amp; pengepul terverifikasi dengan
            timbangan digital transparan, jaminan pelunasan di hari timbang, dan penjemputan
            langsung ke gudang tani.
          </p>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Step 1: Pilih Jenis Komoditas */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#1C241E]">Pilih Jenis Komoditas</h2>
                    <p className="text-xs text-[#7A827C]">
                      Tentukan jenis hasil panen yang akan dipasarkan hari ini.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#156E33] shrink-0">Wajib Diisi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {commodities.map((item) => {
                  const isSelected = selectedCommodity === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedCommodity(item.id);
                        setExpectedPrice(item.defaultPrice);
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#156E33] border-[#156E33] text-white shadow-xs'
                          : 'bg-[#F8F6F1] border-[#ECE8DF] text-[#1C241E] hover:border-[#D4CFC3]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={
                            isSelected ? 'text-white' : 'text-[#8C5828]'
                          }
                        >
                          {item.icon}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">{item.name}</p>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? 'text-white/85' : 'text-[#7A827C]'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Spesifikasi & Estimasi Bobot */}
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
                    Masukkan varietas dan berat perkiraan untuk penyesuaian armada truk tengkulak.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Varietas Tanaman */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Varietas Tanaman
                  </label>
                  <div className="relative">
                    <select
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                      className="w-full appearance-none rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white px-3.5 py-2.5 pr-9 text-sm font-medium text-[#1C241E] outline-none transition-colors"
                    >
                      <option>Inpari 32 (Standar Bulir Sedang)</option>
                      <option>Ciherang (Pulir Panjang)</option>
                      <option>IR-64 (Kualitas Umum)</option>
                      <option>Menthik Wangi (Beras Premium)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#5C635E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-[#7A827C]">
                    Bantu pembeli mengetahui tekstur dan rendemen beras.
                  </p>
                </div>

                {/* Estimasi Berat / Volume */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Estimasi Berat / Volume
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
                      Kilogram (Kg)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7A827C]">
                    <span>
                      Setara dengan: <strong className="text-[#1C241E]">{tonEquivalent} Ton</strong>
                    </span>
                    <span>Min. jual: 500 Kg</span>
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
                <div className="space-y-1.5">
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
                    Radius jemput bebas biaya transport untuk radius &lt; 25 km.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Ekspektasi Harga & Kualitas Gabah */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-[#E8F5EC] text-[#156E33] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1C241E]">
                    Ekspektasi Harga &amp; Kualitas Gabah
                  </h2>
                  <p className="text-xs text-[#7A827C]">
                    Tentukan batas harga minimal yang Anda terima dari pembeli.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1C241E]">
                  Harga Harapan Petani per Kilogram
                </label>
                <div className="flex items-center rounded-xl bg-[#F5F2EB] border border-transparent focus-within:border-[#156E33] focus-within:bg-white px-3.5 py-2.5 transition-colors">
                  <span className="text-sm font-bold text-[#1C241E] mr-2">Rp</span>
                  <input
                    type="number"
                    value={expectedPrice}
                    onChange={(e) => setExpectedPrice(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold text-[#1C241E] outline-none"
                  />
                  <span className="text-xs font-medium text-[#7A827C] ml-2">/ kg</span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-[#5C635E] pt-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#156E33]" />
                  Rekomendasi pasar Ngawi hari ini:{' '}
                  <strong className="text-[#156E33]">Rp 7.200 – Rp 7.450 / kg</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Foto Sampel Gabah */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#1C241E]">
                    Foto Sampel Gabah / Bulir (Opsional)
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[#ECE8DF] bg-[#FAF8F4]">
                    <div className="w-14 h-14 rounded-lg bg-[#D8C39E] overflow-hidden shrink-0 flex items-center justify-center text-[#6B532C]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1C241E] truncate">
                        sampel_gabah_blokA.jpg
                      </p>
                      <p className="text-[11px] text-[#7A827C]">1.4 MB • Siap diunggah</p>
                      <button
                        type="button"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#156E33] hover:underline cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Ganti Foto
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
                    placeholder="Misal: Gabah dipanen memakai mesin Combine Harvester, bersih tanpa jerami dan batu."
                    className="w-full rounded-xl bg-[#F5F2EB] border border-transparent focus:border-[#156E33] focus:bg-white p-3 text-xs text-[#1C241E] placeholder:text-[#9AA19C] outline-none resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button & Disclaimer */}
            <div className="space-y-3">
              <button
                type="button"
                className="w-full py-3.5 px-6 rounded-xl bg-[#156E33] hover:bg-[#105728] active:scale-[0.995] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Publikasikan Penjualan Panen
              </button>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F4F1EA] text-xs text-[#5C635E]">
                <ShieldCheck className="w-4 h-4 text-[#156E33] shrink-0 mt-0.5" />
                <p>
                  Dengan mempublikasikan, Anda sepakat dengan standar timbangan tera digital Tandur.
                  Pengepul dilarang menerapkan potongan tak tertera tanpa persetujuan petani.
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
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1C241E]">
                Rp {formatRupiah(grossRevenue)}
              </p>
              <p className="text-xs text-[#7A827C]">
                {formatRupiah(weightKg)} Kg × Rp {formatRupiah(expectedPrice)} / Kg
              </p>
            </div>

            {/* Pasar Hari Ini */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#156E33]" />
                  <h3 className="text-sm font-bold text-[#1C241E]">Pasar Hari Ini</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#F2EFE9] text-[10px] font-medium text-[#5C635E]">
                  Wilayah Ngawi &amp; Madiun
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[11px] text-[#7A827C]">Terendah</p>
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">Rp 6.950</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Rata-rata</p>
                  <p className="text-xs font-bold text-[#156E33] mt-0.5">Rp 7.320</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Tertinggi</p>
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">Rp 7.550</p>
                </div>
              </div>

              {/* Progress Price Indicator Bar */}
              <div className="relative h-2 w-full rounded-full bg-[#EFECE6]">
                <div className="absolute left-0 top-0 h-full w-3/5 rounded-full bg-[#156E33]" />
                <div className="absolute left-[58%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#156E33] shadow-xs" />
              </div>

              <p className="text-xs text-[#5C635E] leading-relaxed">
                Harga penawaran Anda (<strong className="text-[#1C241E]">Rp {formatRupiah(expectedPrice)}</strong>) tergolong sangat kompetitif.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}