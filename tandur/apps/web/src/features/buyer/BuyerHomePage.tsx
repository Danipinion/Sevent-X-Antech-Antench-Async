import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  ArrowRight,
  Clock,
  BadgePercent,
  Truck,
  ShieldCheck,
  Zap,
  Star,
  Plus,
  ShoppingCart,
  Wheat,
  Leaf,
  Apple,
  Flame,
  Bean,
  Egg,
  Droplets,
} from 'lucide-react';

export const BuyerHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('Semua Hasil Panen');

  const categories = [
    { name: 'Beras & Gabah', count: '42 Produk', icon: Wheat, bg: 'bg-[#F5EFE4]', color: 'text-[#8A5A19]' },
    { name: 'Sayur Segar', count: '86 Produk', icon: Leaf, bg: 'bg-[#E5F3E8]', color: 'text-[#236B37]' },
    { name: 'Buah Panen', count: '34 Produk', icon: Apple, bg: 'bg-[#FDF1E6]', color: 'text-[#C2621A]' },
    { name: 'Cabai & Bawang', count: '19 Produk', icon: Flame, bg: 'bg-[#FCEAEA]', color: 'text-[#C93B3B]' },
    { name: 'Palawija & Jagung', count: '28 Produk', icon: Bean, bg: 'bg-[#F7F1DF]', color: 'text-[#8C6D1F]' },
    { name: 'Telur & Ternak', count: '15 Produk', icon: Egg, bg: 'bg-[#F3EFE6]', color: 'text-[#6D5A43]' },
    { name: 'Kopi & Madu', count: '24 Produk', icon: Droplets, bg: 'bg-[#EFE8DF]', color: 'text-[#6E4726]' },
  ];

  const flashDeals = [
    {
      id: 'beras-pandan-wangi',
      discount: '-14%',
      farmer: 'Gapoktan Cianjur',
      name: 'Beras Pandan Wangi Cianjur...',
      weight: 'Kemasan 5 kg',
      price: 'Rp 79.000',
      oldPrice: 'Rp 92.000',
      soldText: 'Tersisa 18 karung',
      progress: 75,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'tomat-ceri-lembang',
      discount: '-20%',
      farmer: 'Gapoktan Lembang',
      name: 'Tomat Ceri Hidroponik Super...',
      weight: '500 gram',
      price: 'Rp 14.500',
      oldPrice: 'Rp 18.000',
      soldText: 'Tersisa 12 pak',
      progress: 82,
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'alpukat-mentega',
      discount: '-18%',
      farmer: 'Kebun Batu Malang',
      name: 'Alpukat Mentega Super Tua...',
      weight: '1 kg (Isi 3–4 Buah)',
      price: 'Rp 32.000',
      oldPrice: 'Rp 39.000',
      soldText: 'Tersisa 9 kg',
      progress: 88,
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'cabai-rawit-merah',
      discount: '-25%',
      farmer: 'Petani Temanggung',
      name: 'Cabai Rawit Merah Petik...',
      weight: '250 gram',
      price: 'Rp 16.800',
      oldPrice: 'Rp 22.500',
      soldText: 'Tersisa 24 pak',
      progress: 65,
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'bawang-merah-brebes',
      discount: '-19%',
      farmer: 'Sentra Tani Brebes',
      name: 'Bawang Merah Brebes Asli...',
      weight: '1 kg',
      price: 'Rp 36.500',
      oldPrice: 'Rp 45.000',
      soldText: 'Tersisa 15 kg',
      progress: 70,
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=500&q=80',
    },
  ];

  const bestSellers = [
    {
      id: 'bayam-hijau',
      badge: 'Petik Pagi Ini',
      badgeStyle: 'bg-[#236B37] text-white',
      rating: '4.9',
      reviews: '(312 Ulasan)',
      name: 'Bayam Hijau Organik Petik Pagi',
      meta: 'Ikat 250 gram • Mitra Lembang',
      price: 'Rp 4.500',
      category: 'Sayur Segar',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'beras-merah-tabanan',
      badge: 'Pulen & Rendah Gula',
      badgeStyle: 'bg-[#8A5A19] text-white',
      rating: '4.9',
      reviews: '(428 Ulasan)',
      name: 'Beras Merah Organik Tabanan',
      meta: 'Kemasan 2 kg • Gapoktan Bali',
      price: 'Rp 44.000',
      category: 'Beras & Biji',
      image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'mangga-gedong-gincu',
      badge: 'Matang Pohon',
      badgeStyle: 'bg-[#C2621A] text-white',
      rating: '4.8',
      reviews: '(195 Ulasan)',
      name: 'Mangga Gedong Gincu Asli Majalengka',
      meta: '1 kg (Isi 4–5) • Kebun Sindangwangi',
      price: 'Rp 28.500',
      category: 'Buah Lokal',
      image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'jahe-merah-tua',
      badge: 'Aroma Kuat',
      badgeStyle: 'bg-[#7A532E] text-white',
      rating: '4.9',
      reviews: '(264 Ulasan)',
      name: 'Jahe Merah Tua Bersih Tanah',
      meta: '500 gram • Petani Wonosobo',
      price: 'Rp 18.000',
      category: 'Bumbu Dapur',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'wortel-manis-berastagi',
      badge: 'Segar Harian',
      badgeStyle: 'bg-[#236B37] text-white',
      rating: '4.8',
      reviews: '(180 Ulasan)',
      name: 'Wortel Manis Berastagi Super',
      meta: '1 kg • Grade A Tanpa Tanah',
      price: 'Rp 15.000',
      category: 'Sayur Segar',
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'beras-mentik-susu',
      badge: 'Panen Minggu Ini',
      badgeStyle: 'bg-[#236B37] text-white',
      rating: '5.0',
      reviews: '(510 Ulasan)',
      name: 'Beras Mentik Susu Organik',
      meta: 'Kemasan 5 kg • Gapoktan Magelang',
      price: 'Rp 85.000',
      category: 'Beras & Biji',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'pisang-cavendish-sunpride',
      badge: 'Manis Alami',
      badgeStyle: 'bg-[#B6771E] text-white',
      rating: '4.8',
      reviews: '(219 Ulasan)',
      name: 'Pisang Cavendish Grade A',
      meta: 'Sisir 1.2 kg • Perkebunan Lampung',
      price: 'Rp 21.000',
      category: 'Buah Lokal',
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'bawang-putih-lanang',
      badge: 'Kualitas Super',
      badgeStyle: 'bg-[#8A5A19] text-white',
      rating: '4.9',
      reviews: '(142 Ulasan)',
      name: 'Bawang Putih Lanang / Tunggal',
      meta: '250 gram • Mitra Tani Temanggung',
      price: 'Rp 29.000',
      category: 'Bumbu Dapur',
      image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=500&q=80',
    },
  ];

  const testimonials = [
    {
      quote:
        '"Kualitas beras Pandan Wangi di Tandur beda banget sama beli di supermarket. Wanginya alami banget, tidak apek, dan pulen. Anak-anak di rumah jadi lahap makan setiap hari!"',
      name: 'Dewi Rahayu',
      role: 'Ibu Rumah Tangga • Jakarta Selatan',
      initials: 'DR',
    },
    {
      quote:
        '"Untuk kebutuhan sayur dan cabai resto saya di Bandung, Tandur selalu jadi andalan. Langsung dari Gapoktan Lembang sehingga lebih segar, harganya stabil, dan timbangannya pas."',
      name: 'Reza Pratama',
      role: 'Pemilik Resto • Bandung',
      initials: 'RP',
    },
    {
      quote:
        '"Senang bisa belanja langsung sambil mendukung petani lokal di daerah lewat aplikasi Tandur. Alpukat menteganya benar-benar tua pohon dan matang merata tanpa karbit."',
      name: 'dr. Annisa Kusuma',
      role: 'Dokter • Surabaya',
      initials: 'AK',
    },
  ];

  const filteredBestSellers =
    activeFilter === 'Semua Hasil Panen'
      ? bestSellers
      : bestSellers.filter((item) => item.category === activeFilter);

  return (
    <div className="min-h-screen bg-[#FAF8F3] font-sans text-[#1E241E] pb-16">
      {/* 1. Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#F4EFE4] via-[#F7F3EA] to-[#EFE8D8] border-b border-[#EAE2D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] text-xs font-bold">
                <Sprout className="w-3.5 h-3.5" />
                Musim Panen Raya Nusantara
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold text-[#1A201A] leading-tight tracking-tight">
                Segar Langsung dari Petani Nusantara, Tiba di Rumah Anda
              </h1>

              <p className="text-xs sm:text-sm text-[#5C645C] max-w-xl leading-relaxed">
                Beli beras organik, sayuran segar petik hari ini, dan buah lokal langsung dari gabungan kelompok tani terverifikasi dengan timbangan jujur dan harga transparan.
              </p>

              <div className="pt-1">
                <button
                  onClick={() => navigate('/produk/beras-pandan-wangi')}
                  className="inline-flex items-center gap-2 bg-[#236B37] hover:bg-[#1B552B] active:scale-[0.99] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Belanja Sekarang
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Trust Badges */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E1F3E5] text-[#236B37] flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1A201A]">Petik Hari Ini</div>
                    <div className="text-[10px] text-[#7A827A]">Langsung lelang</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F8EFE2] text-[#8A5A19] flex items-center justify-center shrink-0">
                    <BadgePercent className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1A201A]">Harga Petani</div>
                    <div className="text-[10px] text-[#7A827A]">Tanpa tengkulak</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E1F3E5] text-[#236B37] flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1A201A]">Kirim Cepat</div>
                    <div className="text-[10px] text-[#7A827A]">Tiba hari sama</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F3EFE6] text-[#5C645C] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1A201A]">Bebas Residu</div>
                    <div className="text-[10px] text-[#7A827A]">Sertifikasi mutu</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Decorative Fresh Harvest Visual */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80"
                  alt="Hasil Panen Segar Tandur"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xs rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs font-extrabold text-[#1A201A]">100% Hasil Panen Terverifikasi</div>
                    <div className="text-[11px] text-[#6D756D]">Dari 240+ Gapoktan Mitra Nusantara</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                    Segar 24 Jam
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pt-8">
        {/* 2. Kategori Pilihan */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
                Kategori Pilihan
              </h2>
              <p className="text-xs text-[#6D756D]">
                Komoditas pangan segar yang dipanen sesuai siklus musim terbaik
              </p>
            </div>
            <button className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer">
              Lihat Semua →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.name}
                  className="bg-white hover:bg-[#FCFBF8] rounded-2xl border border-[#ECE6DA] hover:border-[#236B37]/40 p-4 flex flex-col items-center text-center transition-all shadow-[0_2px_6px_rgba(0,0,0,0.015)] cursor-pointer group"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-[#1A201A]">{cat.name}</div>
                  <div className="text-[11px] text-[#8E968E] mt-0.5">{cat.count}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Flash Deal Panen Raya */}
        <section className="bg-white rounded-3xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C93B3B] fill-[#C93B3B]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
                Flash Deal Panen Raya
              </h2>
              <span className="ml-1 px-2.5 py-0.5 rounded-md bg-[#FCECEC] text-[#C93B3B] text-xs font-mono font-bold">
                02 : 14 : 45
              </span>
            </div>

            <button className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer">
              Lihat Semua Flash Deal →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {flashDeals.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/produk/beras-pandan-wangi')}
                className="bg-[#FAF8F3] rounded-2xl border border-[#EAE2D3] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#C93B3B] text-white text-[10px] font-extrabold">
                      {item.discount}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="text-[10px] font-semibold text-[#8A5A19]">
                      • {item.farmer}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1A201A] line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="text-[11px] text-[#7A827A]">{item.weight}</div>

                    <div className="pt-1 flex items-baseline gap-1.5">
                      <span className="text-sm sm:text-base font-extrabold text-[#236B37]">
                        {item.price}
                      </span>
                      <span className="text-[11px] text-[#9AA19A] line-through">
                        {item.oldPrice}
                      </span>
                    </div>

                    <div className="pt-1 space-y-1">
                      <div className="w-full h-1.5 bg-[#E6DFD2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C93B3B] rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[#6D756D]">{item.soldText}</div>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/keranjang');
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />+ Keranjang
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Dual Promo Banners */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Banner: Warm Amber */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#A86B24] to-[#D49B4B] p-6 sm:p-7 text-white flex items-center justify-between gap-4 shadow-sm">
            <div className="space-y-2.5 max-w-xs z-10">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/20 text-[10px] font-extrabold uppercase tracking-wider">
                PANEN RAYA BUAH
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold leading-snug">
                Manis Alami Tanpa Karbit
              </h3>
              <p className="text-xs text-white/90 leading-relaxed">
                Alpukat mentega & mangga langsung dari kebun dataran tinggi.
              </p>
              <button className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#8A5A19] text-xs font-extrabold hover:bg-[#FAF8F3] transition-colors cursor-pointer">
                Eksplor Buah →
              </button>
            </div>
            <img
              src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80"
              alt="Buah Segar"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-white/30 shrink-0"
            />
          </div>

          {/* Right Banner: Forest Green */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A582B] to-[#2B7A3E] p-6 sm:p-7 text-white flex items-center justify-between gap-4 shadow-sm">
            <div className="space-y-2.5 max-w-xs z-10">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/20 text-[10px] font-extrabold uppercase tracking-wider">
                PAKET LANGGANAN SAYUR
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold leading-snug">
                Dapur Sehat Tiap Pekan
              </h3>
              <p className="text-xs text-white/90 leading-relaxed">
                Kombinasi 7 sayur segar dan bumbu dapur, diskon hingga 15% tiap pengiriman rutin.
              </p>
              <button className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#236B37] text-xs font-extrabold hover:bg-[#FAF8F3] transition-colors cursor-pointer">
                Pilih Paket Sehat →
              </button>
            </div>
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80"
              alt="Paket Sayur Segar"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-white/30 shrink-0"
            />
          </div>
        </section>

        {/* 5. Paling Banyak Dibeli */}
        <section className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-[#236B37] uppercase tracking-wider">
                • Rekomendasi Pilihan
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A201A]">
                Paling Banyak Dibeli
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['Semua Hasil Panen', 'Sayur Segar', 'Beras & Biji', 'Buah Lokal', 'Bumbu Dapur'].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeFilter === tab
                        ? 'bg-[#236B37] text-white'
                        : 'bg-white border border-[#E5DEC9] text-[#555D55] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredBestSellers.map((prod) => (
              <div
                key={prod.id}
                onClick={() => navigate('/produk/beras-pandan-wangi')}
                className="bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#F6F2EA]">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold ${prod.badgeStyle}`}
                    >
                      {prod.badge}
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Star className="w-3.5 h-3.5 text-[#E59819] fill-[#E59819]" />
                      <strong className="text-[#1A201A]">{prod.rating}</strong>
                      <span className="text-[#8E968E]">{prod.reviews}</span>
                    </div>

                    <h3 className="text-sm font-extrabold text-[#1A201A] line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-[#7A827A]">{prod.meta}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#8E968E]">Harga petani</div>
                    <div className="text-base font-extrabold text-[#1A201A]">{prod.price}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/keranjang');
                    }}
                    className="w-8 h-8 rounded-xl bg-[#EAF4EC] hover:bg-[#236B37] text-[#236B37] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Tambah ke keranjang"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Ulasan Pembeli Bahagia */}
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
              Ulasan Pembeli Bahagia
            </h2>
            <p className="text-xs text-[#6D756D]">
              Kepuasan ibu rumah tangga, pengusaha kuliner, dan pecinta pangan segar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5 text-[#E59819]">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#E59819]" />
                    ))}
                  </div>
                  <p className="text-xs text-[#4A524A] leading-relaxed">{t.quote}</p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-[#F4EFE6]">
                  <div className="w-9 h-9 rounded-full bg-[#EAF4EC] text-[#236B37] font-bold text-xs flex items-center justify-center shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#1A201A]">{t.name}</div>
                    <div className="text-[11px] text-[#7A827A]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BuyerHomePage;