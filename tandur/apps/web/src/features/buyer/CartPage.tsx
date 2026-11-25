import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Snowflake,
  Trash2,
  Heart,
  Minus,
  Plus,
  MapPin,
  Truck,
  Zap,
  QrCode,
  Building2,
  Wallet,
  Lock,
  ShieldCheck,
  Scale,
  ShoppingCart,
} from 'lucide-react';

interface CartCommodity {
  id: string;
  checked: boolean;
  farmGroup: string;
  farmLocation: string;
  categoryTag: string;
  name: string;
  badges: { text: string; style: string }[];
  extraNote: string;
  extraIcon: 'shield' | 'snow' | 'package';
  price: number;
  oldPrice?: number;
  subPriceNote?: string;
  quantity: number;
  image: string;
}

const INITIAL_CART: CartCommodity[] = [
  {
    id: 'cart-1',
    checked: true,
    farmGroup: 'Gapoktan Mandiri Cianjur',
    farmLocation: 'Kab. Cianjur, Jawa Barat • Panen 3 Hari Lalu',
    categoryTag: 'LUMBUNG PADI',
    name: 'Beras Pandan Wangi Cianjur Organik (5 kg)',
    badges: [
      { text: 'Panen Baru 2025', style: 'bg-[#FDF1E0] text-[#8A5A19]' },
      { text: 'Sertifikasi Lokal', style: 'bg-[#F3EFE6] text-[#5C645C]' },
      { text: '• Kadar Air 13.5%', style: 'bg-transparent text-[#6D756D]' },
    ],
    extraNote: 'Asuransi Karung Utuh & Segel (+Rp 1.000)',
    extraIcon: 'shield',
    price: 79000,
    oldPrice: 92000,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cart-2',
    checked: true,
    farmGroup: 'Gapoktan Lembang Highland Farm',
    farmLocation: 'Lembang, Bandung Barat • Ketinggian 1.250 mdpl',
    categoryTag: 'HIDROPONIK PEGUNUNGAN',
    name: 'Tomat Ceri Hidroponik Super Lembang (500 g)',
    badges: [
      { text: 'Petik Pagi Ini', style: 'bg-[#E1F3E5] text-[#236B37]' },
      { text: 'Bebas Pestisida Kimia', style: 'bg-[#F3EFE6] text-[#5C645C]' },
      { text: '• Brix 7.8° Brix', style: 'bg-transparent text-[#6D756D]' },
    ],
    extraNote: 'Wajib Dikirim ColdChain',
    extraIcon: 'snow',
    price: 29000,
    subPriceNote: 'Rp 14.500 / pak',
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cart-3',
    checked: true,
    farmGroup: 'Sentra Tani Brebes Mandiri',
    farmLocation: 'Kab. Brebes, Jawa Tengah • Panen Raya Bawang',
    categoryTag: 'PALAWIJA & BUMBU',
    name: 'Bawang Merah Brebes Asli Jemur Kering (1 kg)',
    badges: [
      { text: 'Grade A Super', style: 'bg-[#F3EFE6] text-[#4A524A]' },
      { text: 'Kering Simpan 35 Hari', style: 'bg-[#F3EFE6] text-[#5C645C]' },
      { text: '• Umbi Padat Berisi', style: 'bg-transparent text-[#6D756D]' },
    ],
    extraNote: 'Kemasan Jaring Bernapas',
    extraIcon: 'package',
    price: 36500,
    oldPrice: 45000,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80',
  },
];

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartCommodity[]>(INITIAL_CART);
  const [shippingMethod, setShippingMethod] = useState<'coldchain' | 'sameday'>('coldchain');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'wallet'>('qris');
  const [farmerNote, setFarmerNote] = useState<string>(
    'Titipkan di pos satpam perumahan jika tidak ada orang di rumah'
  );

  const recommendations = [
    {
      farmer: 'Gapoktan Lembang Farm',
      name: 'Cabai Rawit Merah Segar (250...',
      price: 'Rp 16.800',
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=400&q=80',
    },
    {
      farmer: 'Gapoktan Tabanan Subak',
      name: 'Beras Merah Organik Tabanan',
      price: 'Rp 44.000',
      image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=400&q=80',
    },
    {
      farmer: 'Peternak Mandiri Ciamis',
      name: 'Telur Ayam Kampung Pakan...',
      price: 'Rp 28.500',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
    },
    {
      farmer: 'Koperasi Nira Banyumas',
      name: 'Gula Kelapa Cetak Organik (1...',
      price: 'Rp 24.000',
      image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const allChecked = items.length > 0 && items.every((i) => i.checked);

  const toggleAll = () => {
    const next = !allChecked;
    setItems((prev) => prev.map((i) => ({ ...i, checked: next })));
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const removeSelected = () => {
    setItems((prev) => prev.filter((i) => !i.checked));
  };

  const selectedItems = items.filter((i) => i.checked);
  const itemsSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const insuranceFee = selectedItems.length > 0 ? 1000 : 0;
  const qualityFee = selectedItems.length > 0 ? 1000 : 0;
  const shippingCost = shippingMethod === 'coldchain' ? 0 : 28000;
  const grandTotal = itemsSubtotal + insuranceFee + qualityFee + shippingCost;

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-6 sm:py-8 font-sans text-[#1E241E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#7A827A]">
              <button onClick={() => navigate('/')} className="hover:text-[#236B37] cursor-pointer">
                Beranda
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-[#1A201A]">Keranjang Belanja</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#1A201A] tracking-tight">
              Keranjang Belanja Hasil Tani
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#ECE6DA] text-xs font-semibold text-[#236B37] self-start sm:self-auto">
            <Snowflake className="w-4 h-4 shrink-0" />
            <span>
              Jaminan Rantai Dingin
              <br />
              <span className="text-[11px] font-normal text-[#5C645C]">
                Langsung Dari Gapoktan Desa
              </span>
            </span>
          </div>
        </div>

        {/* Main 2-Column Cart Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cart Items + Address & Shipping (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Select All Bar */}
            <div className="bg-white rounded-2xl border border-[#ECE6DA] px-5 py-3.5 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-[#236B37] cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-[#1A201A]">
                  Pilih Semua Komoditas ({items.length})
                </span>
              </label>

              <button
                onClick={removeSelected}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A827A] hover:text-[#C93B3B] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terpilih
              </button>
            </div>

            {/* Cart Item Cards */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
                >
                  {/* Farm Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F4EFE6]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-[#EAF4EC] text-[#236B37] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        🌱
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-[#1A201A]">
                          {item.farmGroup}
                        </div>
                        <div className="text-[11px] text-[#7A827A]">{item.farmLocation}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F6F2EA] text-[#8A5A19] text-[10px] font-extrabold tracking-wider uppercase">
                      {item.categoryTag}
                    </span>
                  </div>

                  {/* Product Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 rounded accent-[#236B37] mt-7 cursor-pointer shrink-0"
                      />
                      <img
                        src={item.image}
                        alt={item.name}
                        onClick={() => navigate('/produk/beras-pandan-wangi')}
                        className="w-20 h-20 rounded-xl object-cover border border-[#EFEAE0] shrink-0 cursor-pointer"
                      />
                      <div className="space-y-1.5">
                        <h3
                          onClick={() => navigate('/produk/beras-pandan-wangi')}
                          className="text-sm sm:text-base font-extrabold text-[#1A201A] hover:text-[#236B37] cursor-pointer"
                        >
                          {item.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.badges.map((b, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${b.style}`}
                            >
                              {b.text}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-[#236B37] font-medium pt-0.5">
                          {item.extraIcon === 'shield' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {item.extraIcon === 'snow' && <Snowflake className="w-3.5 h-3.5" />}
                          {item.extraIcon === 'package' && (
                            <span className="text-[#8A5A19]">📦</span>
                          )}
                          <span
                            className={
                              item.extraIcon === 'package' ? 'text-[#8A5A19]' : 'text-[#236B37]'
                            }
                          >
                            {item.extraNote}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Quantity Controls */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F4EFE6] shrink-0">
                      <div className="sm:text-right">
                        <div className="text-base font-extrabold text-[#236B37]">
                          {formatRupiah(item.price)}
                        </div>
                        {item.oldPrice && (
                          <div className="text-xs text-[#9AA19A] line-through">
                            {formatRupiah(item.oldPrice)}
                          </div>
                        )}
                        {item.subPriceNote && (
                          <div className="text-[11px] text-[#7A827A]">{item.subPriceNote}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-[#8E968E] hover:text-[#C93B3B] hover:bg-[#FCECEC] transition-colors cursor-pointer"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-[#8E968E] hover:text-[#C93B3B] transition-colors cursor-pointer"
                          aria-label="Simpan ke favorit"
                        >
                          <Heart className="w-4 h-4" />
                        </button>

                        <div className="inline-flex items-center bg-[#FAF8F3] border border-[#E5DEC9] rounded-xl p-1">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-center text-[#2D332D] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 text-xs font-extrabold text-[#1A201A]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-center text-[#2D332D] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alamat & Pengiriman Card */}
            <div className="bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#1A201A]">
                  <Truck className="w-4 h-4 text-[#236B37]" />
                  <h2>Alamat & Pengiriman</h2>
                </div>
                <button className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer">
                  Ubah Alamat
                </button>
              </div>

              {/* Address Box */}
              <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8A5A19]" />
                  <span className="text-xs sm:text-sm font-extrabold text-[#1A201A]">
                    Rumah Utama - Siti Rahmawati
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#236B37] text-white text-[10px] font-bold">
                    Utama
                  </span>
                </div>
                <div className="text-xs text-[#6D756D] pl-6">0812-3456-7890</div>
                <p className="text-xs text-[#4A524A] pl-6 leading-relaxed">
                  Jl. Melati Indah No. 42, RT 04 / RW 07, Kel. Tebet Barat, Kec. Tebet, Kota Jakarta Selatan, DKI Jakarta 12810
                </p>
              </div>

              {/* Courier Options */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6D756D]">
                  PILIH LAYANAN EKSPEDISI TANI
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Option 1: Tandur ColdChain */}
                  <button
                    type="button"
                    onClick={() => setShippingMethod('coldchain')}
                    className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      shippingMethod === 'coldchain'
                        ? 'bg-[#F3F9F4] border-[#236B37] ring-1 ring-[#236B37]'
                        : 'bg-white border-[#E5DEC9] hover:border-[#C5BCA8]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1A201A]">
                          <Snowflake className="w-3.5 h-3.5 text-[#236B37]" />
                          Tandur ColdChain & Fleet
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            shippingMethod === 'coldchain'
                              ? 'border-[#236B37]'
                              : 'border-[#C5BCA8]'
                          }`}
                        >
                          {shippingMethod === 'coldchain' && (
                            <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555D55] leading-relaxed">
                        Kendaraan berpendingin mikro 4°C. Sayuran & hasil panen tetap segar laksana baru dipetik.
                      </p>
                      <div className="text-[11px] font-bold text-[#236B37]">
                        Tiba Besok Pagi (08:00 - 12:00 WIB)
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD2]">
                      <span className="text-sm font-extrabold text-[#1A201A]">Rp 0</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#236B37] text-white text-[10px] font-bold">
                        Gratis Ongkir Panen
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Instant Sameday */}
                  <button
                    type="button"
                    onClick={() => setShippingMethod('sameday')}
                    className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      shippingMethod === 'sameday'
                        ? 'bg-[#F3F9F4] border-[#236B37] ring-1 ring-[#236B37]'
                        : 'bg-white border-[#E5DEC9] hover:border-[#C5BCA8]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1A201A]">
                          <Zap className="w-3.5 h-3.5 text-[#8A5A19]" />
                          Instant Sameday Agro
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            shippingMethod === 'sameday'
                              ? 'border-[#236B37]'
                              : 'border-[#C5BCA8]'
                          }`}
                        >
                          {shippingMethod === 'sameday' && (
                            <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555D55] leading-relaxed">
                        Dikirim langsung dengan kurir motor khusus box insulator bersegel.
                      </p>
                      <div className="text-[11px] text-[#6D756D]">
                        Estimasi tiba dalam 3–4 jam hari ini
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD2]">
                      <span className="text-sm font-extrabold text-[#1A201A]">Rp 28.000</span>
                      <span className="text-[11px] text-[#8E968E]">Tarif flat kota</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Farmer Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#555D55]">
                  Catatan Khusus Petani
                </label>
                <input
                  type="text"
                  value={farmerNote}
                  onChange={(e) => setFarmerNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Rincian Pembayaran Sticky Card (4 cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 bg-white rounded-2xl border border-[#ECE6DA] p-5 sm:p-6 space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
            <h2 className="text-base sm:text-lg font-extrabold text-[#1A201A]">
              Rincian Pembayaran
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[#555D55]">
                <span>Total Harga Barang ({selectedItems.length} komoditas)</span>
                <strong className="text-[#1A201A]">{formatRupiah(itemsSubtotal)}</strong>
              </div>
              <div className="flex items-center justify-between text-[#555D55]">
                <span>Asuransi Kemasan Bersegel</span>
                <strong className="text-[#236B37]">+{formatRupiah(insuranceFee)}</strong>
              </div>
              <div className="flex items-center justify-between text-[#555D55]">
                <span>Biaya Penjamin Mutu SNI & Tera</span>
                <strong className="text-[#236B37]">+{formatRupiah(qualityFee)}</strong>
              </div>
              {shippingCost > 0 && (
                <div className="flex items-center justify-between text-[#555D55]">
                  <span>Ongkos Kirim Ekspedisi</span>
                  <strong className="text-[#1A201A]">+{formatRupiah(shippingCost)}</strong>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EFEAE0]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6D756D]">
                TOTAL TAGIHAN
              </div>
              <div className="text-2xl font-extrabold text-[#236B37] mt-0.5">
                {formatRupiah(grandTotal)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#555D55]">
                Metode Pembayaran Cepat
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'qris', label: 'QRIS Instan', icon: QrCode },
                  { key: 'va', label: 'Virtual Acc.', icon: Building2 },
                  { key: 'wallet', label: 'Dompet Tani', icon: Wallet },
                ].map((m) => {
                  const IconComp = m.icon;
                  const active = paymentMethod === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key as any)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-[#F3F9F4] border-[#236B37] text-[#236B37]'
                          : 'bg-[#FAF8F3] border-[#E5DEC9] text-[#4A524A] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pay Now Button */}
            <button
              onClick={() => alert(`Memproses pembayaran sebesar ${formatRupiah(grandTotal)}...`)}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold transition-all shadow-sm cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Bayar Sekarang • {formatRupiah(grandTotal)}
            </button>

            {/* Trust Guarantees */}
            <div className="pt-2 space-y-2 text-[11px] text-[#5C645C]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#236B37] shrink-0 mt-0.5" />
                <span>100% Garansi Panen Segar / Dana Kembali Penuh</span>
              </div>
              <div className="flex items-start gap-2">
                <Scale className="w-3.5 h-3.5 text-[#8A5A19] shrink-0 mt-0.5" />
                <span>Tera Digital Legal Metrologi RI Terverifikasi</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-[#6D756D] shrink-0 mt-0.5" />
                <span>Transaksi Terenkripsi Aman 256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Recommendations: Mungkin Anda Juga Membutuhkan */}
        <section className="space-y-4 pt-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1A201A]">
                Mungkin Anda Juga Membutuhkan
              </h2>
              <p className="text-xs text-[#6D756D]">
                Hasil panen pelengkap, hemat ongkos kirim satu armada
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold text-[#236B37] hover:underline cursor-pointer"
            >
              Lihat Produk Segar Lainnya →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#F6F2EA] overflow-hidden">
                    <img
                      src={rec.image}
                      alt={rec.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="text-[11px] font-semibold text-[#8A5A19]">{rec.farmer}</div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#1A201A] line-clamp-1">
                      {rec.name}
                    </h3>
                    <div className="text-sm sm:text-base font-extrabold text-[#236B37] pt-0.5">
                      {rec.price}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => navigate('/produk/beras-pandan-wangi')}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#EAF4EC] border border-[#E5DEC9] hover:border-[#236B37] text-[#1A201A] hover:text-[#236B37] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />+ Tambah ke Troli
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

export default CartPage;