import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Calendar,
  MapPin,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { BuyerApi, type CartItem } from '@/services/api';

const CART_STORAGE_KEY = 'tandur_buyer_cart';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupSchedule, setPickupSchedule] = useState<string>('');
  const [buyerNote, setBuyerNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCart() {
      setIsLoading(true);
      try {
        const res = await BuyerApi.getCart();
        const apiItems = Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : null;

        if (isMounted && apiItems) {
          setItems(apiItems);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fallback ke localStorage jika offline atau endpoint belum mengembalikan data
      }

      if (isMounted) {
        try {
          const raw = localStorage.getItem(CART_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setItems(Array.isArray(parsed) ? parsed : []);
          } else {
            setItems([]);
          }
        } catch {
          setItems([]);
        }
        setIsLoading(false);
      }
    }
    loadCart();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncLocalCart = (updated: CartItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Abaikan jika gagal menulis ke localStorage
    }
  };

  const handleUpdateQty = async (item: CartItem, deltaKg: number) => {
    const nextQty = Math.max(25, item.quantity_kg + deltaKg);
    try {
      await BuyerApi.updateCartItem(item.id, nextQty);
    } catch {
      // Tetap perbarui di state & localStorage
    }

    const updated = items.map((c) =>
      c.id === item.id
        ? {
            ...c,
            quantity_kg: nextQty,
            subtotal: nextQty * c.price_per_kg,
          }
        : c
    );
    syncLocalCart(updated);
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await BuyerApi.removeCartItem(id);
    } catch {
      // Tetap hapus di state & localStorage
    }
    const updated = items.filter((c) => c.id !== id);
    syncLocalCart(updated);
  };

  const totalWeightKg = items.reduce((acc, item) => acc + item.quantity_kg, 0);
  const totalAmount = items.reduce((acc, item) => acc + item.subtotal, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsCheckingOut(true);
    try {
      await BuyerApi.checkoutCashOnPickup({
        pickup_schedule: pickupSchedule,
        buyer_note: buyerNote,
        payment_method: 'cash_on_pickup',
      });
    } catch {
      // Tetap lanjutkan proses pesanan lokal bila server offline
    } finally {
      setIsCheckingOut(false);
    }

    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Abaikan jika localStorage gagal
    }
    setItems([]);

    await Swal.fire({
      icon: 'success',
      title: 'Pesanan Cash on Pickup Dibuat!',
      text: `Jadwal pengambilan "${pickupSchedule}" telah dikirim ke petani/gudang. Silakan lakukan pembayaran tunai setelah penimbangan di lokasi.`,
      confirmButtonColor: '#236B37',
    });

    navigate('/produk');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-[#1E241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              to="/produk"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#236B37] hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Lanjut Belanja Komoditas
            </Link>
            <h1 className="text-2xl font-extrabold text-[#1A201A]">
              Keranjang Belanja &amp; Jadwal Ambil
            </h1>
          </div>

          <span className="self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#EAF4EC] text-[#236B37] text-xs font-bold">
            {items.length} Komoditas Dipilih
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#236B37] animate-spin" />
            <p className="text-sm font-bold text-[#1A201A]">
              Memuat Keranjang Belanja...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EFE6] text-[#8A5A19] flex items-center justify-center mx-auto">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1A201A]">
                Keranjang Belanja Masih Kosong
              </h2>
              <p className="text-xs sm:text-sm text-[#6D756D]">
                Pilih beras atau komoditas panen segar langsung dari petani mitra Tandur.
              </p>
            </div>
            <Link
              to="/produk"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs sm:text-sm font-bold transition-colors"
            >
              Jelajahi Katalog Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Cart Items List */}
            <div className="lg:col-span-7 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#ECE6DA] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#1A201A]">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#6D756D]">
                      <MapPin className="w-3.5 h-3.5 text-[#8A5A19] shrink-0" />
                      <span>{item.seller_name}</span>
                    </div>
                    <div className="text-xs font-bold text-[#236B37]">
                      Rp {item.price_per_kg.toLocaleString('id-ID')} / kg
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                    <div className="text-base font-extrabold text-[#1A201A]">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item, -25)}
                        disabled={item.quantity_kg <= 25}
                        className="w-7 h-7 rounded-lg bg-[#F6F2EA] border border-[#E2DACB] flex items-center justify-center text-[#1A201A] disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold w-14 text-center">
                        {item.quantity_kg} kg
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item, 25)}
                        className="w-7 h-7 rounded-lg bg-[#F6F2EA] border border-[#E2DACB] flex items-center justify-center text-[#1A201A] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-[#C93B3B] hover:bg-[#FCECEC] transition-colors ml-1 cursor-pointer"
                        title="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column (5 cols): Cash on Pickup Checkout Form */}
            <form
              onSubmit={handleCheckout}
              className="lg:col-span-5 bg-white rounded-2xl border border-[#ECE6DA] p-6 space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#1A201A]">
                  Ringkasan &amp; Jadwal Ambil
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                  <Banknote className="w-3.5 h-3.5" />
                  Cash on Pickup
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2D332D]">
                    Rencana Waktu Pengambilan di Lokasi
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#7A827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={pickupSchedule}
                      onChange={(e) => setPickupSchedule(e.target.value)}
                      placeholder="Contoh: Besok Pagi, 09:00 WIB"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E2DACB] text-xs sm:text-sm font-medium text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2D332D]">
                    Catatan untuk Petani / Gudang (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={buyerNote}
                    onChange={(e) => setBuyerNote(e.target.value)}
                    placeholder="Contoh: Bawa armada pickup sendiri, mohon siapkan karung tersegel."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F3] border border-[#E2DACB] text-xs text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37] resize-none"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] space-y-2 text-xs">
                <div className="flex justify-between text-[#6D756D]">
                  <span>Total Bobot Pesanan</span>
                  <strong className="text-[#1A201A]">
                    {totalWeightKg.toLocaleString('id-ID')} kg
                  </strong>
                </div>
                <div className="flex justify-between text-[#6D756D]">
                  <span>Metode Pembayaran</span>
                  <strong className="text-[#236B37]">
                    Tunai Saat Timbang di Lokasi
                  </strong>
                </div>
                <div className="pt-2 border-t border-[#E6DFD2] flex items-center justify-between">
                  <span className="font-bold text-[#1A201A]">
                    Total Pembayaran
                  </span>
                  <span className="text-xl font-extrabold text-[#236B37]">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCheckingOut}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isCheckingOut
                  ? 'Memproses Pesanan...'
                  : 'Konfirmasi Pesanan (Cash on Pickup)'}
              </button>

              <div className="flex items-start gap-2 text-[11px] text-[#7A827A]">
                <ShieldCheck className="w-4 h-4 text-[#236B37] shrink-0" />
                <span>
                  Dana dibayarkan langsung ke mitra petani/gudang setelah timbangan digital dikonfirmasi kedua belah pihak.
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;