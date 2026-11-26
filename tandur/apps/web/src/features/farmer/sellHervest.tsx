import React, { useState, useRef } from 'react';
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
  ChevronDown,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { FarmerApi } from '@/services/api';

interface CommodityOption {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  defaultPrice: number;
  icon: React.ReactNode;
}

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

  const commodities: CommodityOption[] = [
    {
      id: 'gkp',
      code: 'GKP',
      name: 'Gabah GKP',
      subtitle: 'Kadar air 20-25%',
      defaultPrice: 7300,
      icon: <Grip className="w-4 h-4" />,
    },
    {
      id: 'gkg',
      code: 'GKG',
      name: 'Gabah GKG',
      subtitle: 'Kadar air 13-14%',
      defaultPrice: 8100,
      icon: <Wheat className="w-4 h-4" />,
    },
    {
      id: 'jagung',
      code: 'JAGUNG',
      name: 'Jagung Pipil',
      subtitle: 'KA 14-16%',
      defaultPrice: 5600,
      icon: <Sprout className="w-4 h-4" />,
    },
    {
      id: 'kedelai',
      code: 'KEDELAI',
      name: 'Kedelai Lokal',
      subtitle: 'Grade A Bersih',
      defaultPrice: 11200,
      icon: <CircleDot className="w-4 h-4" />,
    },
    {
      id: 'cabai',
      code: 'CABAI',
      name: 'Cabai Rawit',
      subtitle: 'Petik Segar',
      defaultPrice: 32000,
      icon: <Flame className="w-4 h-4" />,
    },
    {
      id: 'bawang',
      code: 'BAWANG',
      name: 'Bawang Merah',
      subtitle: 'Askip Kering',
      defaultPrice: 24500,
      icon: <CircleDot className="w-4 h-4" />,
    },
  ];

  const defaultLocation =
    storedUser?.district && storedUser?.city
      ? `${storedUser.district}, ${storedUser.city}`
      : storedUser?.address || 'Sukamaju, Ngawi';

  const [selectedCommodity, setSelectedCommodity] = useState<string>('gkp');
  const [variety, setVariety] = useState<string>('Inpari 32 (Standar Bulir Sedang)');
  const [weightKg, setWeightKg] = useState<number>(8500);
  const [readyDate, setReadyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [pickupLocation, setPickupLocation] = useState<string>(defaultLocation);
  const [expectedPrice, setExpectedPrice] = useState<number>(7300);
  const [notes, setNotes] = useState<string>('');

  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeCommodity =
    commodities.find((c) => c.id === selectedCommodity) || commodities[0];

  const grossRevenue = weightKg * expectedPrice;
  const tonEquivalent = (weightKg / 1000).toFixed(1).replace('.', ',');

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
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
        `Varietas ${variety}, siap timbang & muat mulai ${readyDate}.`;

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
        title: `${activeCommodity.name} - ${variety}`,
        description: cleanNotes,
        estimated_quantity: cleanWeight,
        min_order_quantity: 500,
        unit: 'kg',
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
        text: `${activeCommodity.name} (${tonEquivalent} Ton) berhasil diterbitkan ke jaringan tengkulak Tandur.`,
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
                        <span className={isSelected ? 'text-white' : 'text-[#8C5828]'}>
                          {item.icon}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
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
                  Rekomendasi pasar hari ini:{' '}
                  <strong className="text-[#156E33]">
                    Rp {formatRupiah(Math.max(1000, activeCommodity.defaultPrice - 150))} – Rp{' '}
                    {formatRupiah(activeCommodity.defaultPrice + 200)} / kg
                  </strong>
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
                        {sampleFile ? sampleFile.name : 'sampel_gabah_blokA.jpg'}
                      </p>
                      <p className="text-[11px] text-[#7A827C]">
                        {sampleFile
                          ? `${(sampleFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah`
                          : '1.4 MB • Siap diunggah'}
                      </p>
                      <button
                        type="button"
                        onClick={() => sampleInputRef.current?.click()}
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
              <p className="text-2xl sm:text-3xl font-bold text-[#1C241E]">
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
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">
                    Rp {formatRupiah(Math.max(1000, activeCommodity.defaultPrice - 350))}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Rata-rata</p>
                  <p className="text-xs font-bold text-[#156E33] mt-0.5">
                    Rp {formatRupiah(activeCommodity.defaultPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827C]">Tertinggi</p>
                  <p className="text-xs font-bold text-[#1C241E] mt-0.5">
                    Rp {formatRupiah(activeCommodity.defaultPrice + 250)}
                  </p>
                </div>
              </div>

              {/* Progress Price Indicator Bar */}
              <div className="relative h-2 w-full rounded-full bg-[#EFECE6]">
                <div className="absolute left-0 top-0 h-full w-3/5 rounded-full bg-[#156E33]" />
                <div className="absolute left-[58%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#156E33] shadow-xs" />
              </div>

              <p className="text-xs text-[#5C635E] leading-relaxed">
                Harga penawaran Anda (
                <strong className="text-[#1C241E]">Rp {formatRupiah(expectedPrice)}</strong>)
                tergolong sangat kompetitif.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}