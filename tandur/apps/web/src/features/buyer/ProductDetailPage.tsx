import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  Star,
  MapPin,
  Store,
  Zap,
  Minus,
  Plus,
  ShoppingCart,
  MessageSquare,
  Share2,
  ShieldCheck,
} from 'lucide-react';

interface VariantOption {
  label: string;
  sub?: string;
  price: number;
  pricePerKg: string;
  stock: number;
}

const VARIANTS: VariantOption[] = [
  { label: '2.5 kg', price: 42000, pricePerKg: 'Rp 16.800 / kg', stock: 15 },
  { label: '5 kg', sub: '(Favorit)', price: 79000, pricePerKg: 'Rp 15.800 / kg', stock: 24 },
  { label: '10 kg Karung', price: 152000, pricePerKg: 'Rp 15.200 / kg', stock: 10 },
  { label: '20 kg Curah', price: 295000, pricePerKg: 'Rp 14.750 / kg', stock: 6 },
];

export const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<VariantOption>(VARIANTS[1]);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'deskripsi' | 'ulasan'>('deskripsi');
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);

  const thumbnails = [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  ];
  const [activeImage, setActiveImage] = useState<string>(thumbnails[0]);

  const relatedProducts = [
    {
      badge: 'Segar Pagi',
      badgeBg: 'bg-[#236B37]',
      farmer: 'Gapoktan Lembang',
      name: 'Tomat Ceri Hidroponik Super Lembang (500 g)',
      rating: '4.9 (340)',
      price: 'Rp 14.500',
      unit: '/ pak 500g',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
    },
    {
      badge: 'Grade A',
      badgeBg: 'bg-[#8A5A19]',
      farmer: 'Sentra Tani Brebes',
      name: 'Bawang Merah Brebes Asli Jemur Kering (1 kg)',
      rating: '4.8 (612)',
      price: 'Rp 36.500',
      unit: '/ kg',
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=500&q=80',
    },
    {
      badge: 'Petik Alami',
      badgeBg: 'bg-[#C93B3B]',
      farmer: 'Mitra Petani Temanggung',
      name: 'Cabai Rawit Merah Petik Pagi (250 g)',
      rating: '4.9 (530)',
      price: 'Rp 16.800',
      unit: '/ pak 250g',
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=500&q=80',
    },
    {
      badge: 'Organik',
      badgeBg: 'bg-[#236B37]',
      farmer: 'Subak Jatiluwih Tabanan',
      name: 'Beras Merah Organik Pulen Tabanan (2 kg)',
      rating: '4.9 (340)',
      price: 'Rp 44.000',
      unit: '/ sak 2kg',
      image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=500&q=80',
    },
  ];

  const subtotal = selectedVariant.price * quantity;
  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-6 sm:py-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#7A827A]">
          <button onClick={() => navigate('/')} className="hover:text-[#236B37] cursor-pointer">
            Beranda
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-[#236B37] cursor-pointer">Beras & Gabah</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-[#236B37] cursor-pointer">Beras Organik</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-[#1A201A]">
            Beras Pandan Wangi Cianjur Organik (5 kg)
          </span>
        </nav>

        {/* Main 3-Column Product Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Product Gallery (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative aspect-square rounded-2xl bg-white border border-[#ECE6DA] overflow-hidden shadow-xs">
              <img
                src={activeImage}
                alt="Beras Pandan Wangi Cianjur"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'text-[#C93B3B] fill-[#C93B3B]' : 'text-[#5C645C]'
                  }`}
                />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[11px] font-medium text-[#4A524A] shadow-xs">
                🔍 Geser untuk zoom
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2.5">
              {thumbnails.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImage === img
                      ? 'border-[#236B37] ring-1 ring-[#236B37]'
                      : 'border-[#ECE6DA] opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Product Information (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#236B37]" />
                Official Gapoktan Cianjur Mandiri
              </span>
              <span className="inline-flex items-center gap-1 text-[#8A5A19] font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                Kec. Cugenang, Cianjur
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A201A] leading-snug">
                Beras Pandan Wangi Cianjur Organik - Pulen Alami & Beraroma Daun Pandan Asli (5 kg)
              </h1>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#E59819] fill-[#E59819]" />
                  <strong className="text-[#1A201A]">4.9</strong>
                  <span className="text-[#7A827A]">(1.420 Ulasan)</span>
                </div>
                <span className="text-[#D4CEC2]">•</span>
                <span className="font-semibold text-[#4A524A]">3.800+ Terjual</span>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#236B37]">
                {formatRupiah(selectedVariant.price)}
              </div>
              <div className="text-xs text-[#7A827A]">Setara {selectedVariant.pricePerKg}</div>
            </div>

            {/* Variant Selector */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-[#1A201A]">Pilih Varian Ukuran Kemasan</div>
              <div className="flex flex-wrap gap-2">
                {VARIANTS.map((v) => {
                  const isActive = selectedVariant.label === v.label;
                  return (
                    <button
                      key={v.label}
                      onClick={() => {
                        setSelectedVariant(v);
                        setQuantity(1);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#236B37] border-[#236B37] text-white shadow-xs'
                          : 'bg-white border-[#DFD8CA] text-[#2D332D] hover:border-[#236B37]'
                      }`}
                    >
                      {v.label} {v.sub && <span className="font-normal opacity-90">{v.sub}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shipping Origin Card */}
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#1A201A] flex items-center gap-2">
                <Store className="w-4 h-4 text-[#236B37]" />
                <span>Pengiriman Hasil Panen</span>
              </div>
              <div className="flex items-start gap-2 text-[#555D55]">
                <MapPin className="w-3.5 h-3.5 text-[#8A5A19] shrink-0 mt-0.5" />
                <span>
                  Lumbung Asal: <strong className="text-[#1A201A]">Kec. Cugenang, Cianjur</strong> (Hub Transit: Ps. Minggu, Jaksel)
                </span>
              </div>
              <div className="flex items-start gap-2 text-[#555D55]">
                <Zap className="w-3.5 h-3.5 text-[#236B37] shrink-0 mt-0.5" />
                <span>
                  Estimasi Tiba: <strong className="text-[#236B37]">Besok Pagi (14 - 18 jam)</strong> via Tandur Fleet / Sameday
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Atur Pembelian Card (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <h2 className="text-base font-extrabold text-[#1A201A]">Atur Pembelian</h2>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6D756D]">Kemasan:</span>
                <strong className="text-[#1A201A]">Karung {selectedVariant.label}</strong>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6D756D]">Jumlah Karung</span>
                  <span className="text-[11px] font-semibold text-[#8A5A19]">
                    • Sisa {selectedVariant.stock} sak panen
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#FAF8F3] border border-[#E5DEC9] rounded-xl p-1.5">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-center text-[#2D332D] hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-extrabold text-[#1A201A]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-center text-[#2D332D] hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0EBE1] flex items-baseline justify-between">
                <span className="text-xs text-[#6D756D]">Subtotal</span>
                <span className="text-lg font-extrabold text-[#1A201A]">
                  {formatRupiah(subtotal)}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate('/keranjang')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />+ Keranjang
                </button>
                <button
                  onClick={() => navigate('/keranjang')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#8A5A19] hover:bg-[#734A13] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Beli Sekarang
                </button>
              </div>

              <div className="pt-2 border-t border-[#F0EBE1] grid grid-cols-2 gap-2 text-xs font-semibold text-[#4A524A]">
                <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-[#F6F2EA] cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5 text-[#236B37]" />
                  Tanya Petani
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-[#F6F2EA] cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-[#8A5A19]" />
                  Bagikan
                </button>
              </div>
            </div>

            {/* Segel Keaslian Gapoktan */}
            <div className="bg-[#EAF4EC] rounded-2xl border border-[#D4E8D8] p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#236B37] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-extrabold text-[#1E6632]">
                  Segel Keaslian Gapoktan
                </div>
                <p className="text-[11px] text-[#3A5A42] mt-0.5 leading-relaxed">
                  Dilengkapi QR verifikasi uji metrologi timbangan digital
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description & Reviews Box */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-[#EFEAE0] pb-3">
            <button
              onClick={() => setActiveTab('deskripsi')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'deskripsi'
                  ? 'bg-[#E1F3E5] text-[#236B37]'
                  : 'text-[#6D756D] hover:bg-[#F6F2EA]'
              }`}
            >
              Deskripsi Produk
            </button>
            <button
              onClick={() => setActiveTab('ulasan')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'ulasan'
                  ? 'bg-[#E1F3E5] text-[#236B37]'
                  : 'text-[#6D756D] hover:bg-[#F6F2EA]'
              }`}
            >
              Ulasan Pembeli (1.420)
            </button>
          </div>

          {activeTab === 'deskripsi' ? (
            <div className="space-y-4 text-xs sm:text-sm text-[#4A524A] leading-relaxed max-w-4xl">
              <p>
                <strong className="text-[#1A201A]">Beras Pandan Wangi Cianjur Asli</strong> ini diproduksi langsung oleh para petani binaan di kawasan Cugenang, lereng Gunung Gede Pangrango, Jawa Barat. Tanah vulkanik yang kaya mineral serta aliran mata air pegunungan yang jernih menghasilkan bulir padi dengan keharuman daun pandan alami yang khas dan tekstur pulen legit tanpa perlu penambahan pengikat maupun perasa.
              </p>
              <p>
                Berbeda dengan beras pandan wangi komersial yang sering dicampur beras bibit biasa dan disemprot pewangi, varietas kami adalah{' '}
                <em className="font-semibold text-[#1A201A]">
                  Pandan Wangi Murni (Ciherang–Cianjur Induk)
                </em>{' '}
                dengan umur tanam penuh 145 hari. Setiap butir beras diproses dengan mesin pecah kulit modern bersertifikasi rendah patah, menghasilkan beras berkilau alami tanpa pemutih kimia (klorin).
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs sm:text-sm text-[#4A524A]">
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#EFEAE0]">
                <div className="flex items-center justify-between">
                  <strong className="text-[#1A201A]">Siti Rahmawati • Pembeli Terverifikasi</strong>
                  <span className="text-xs text-[#E59819] font-bold">★★★★★ 5.0</span>
                </div>
                <p className="mt-1 text-xs text-[#555D55]">
                  Berasnya wangi pandan alami banget pas dimasak, pulen dan bersih tanpa kutu atau batu. Karung tersegel rapi.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sering Dibeli Bersama */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
                Sering Dibeli Bersama
              </h2>
              <p className="text-xs text-[#6D756D]">
                Hasil panen segar langsung dari kebun mitra petani lokal
              </p>
            </div>
            <button className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer">
              Lihat Semua →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-[#F6F2EA] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-white text-[10px] font-bold ${item.badgeBg}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#8A5A19]">{item.farmer}</div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#1A201A] line-clamp-2">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-[#7A827A]">
                      <Star className="w-3.5 h-3.5 text-[#E59819] fill-[#E59819]" />
                      <span>{item.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-[#1A201A]">{item.price}</div>
                    <div className="text-[10px] text-[#8E968E]">{item.unit}</div>
                  </div>
                  <button
                    onClick={() => navigate('/keranjang')}
                    className="w-8 h-8 rounded-xl bg-[#EAF4EC] hover:bg-[#236B37] text-[#236B37] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDetailPage;