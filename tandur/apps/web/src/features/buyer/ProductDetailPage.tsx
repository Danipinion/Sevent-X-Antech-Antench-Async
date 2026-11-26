import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Scale,
  ShoppingCart,
  Minus,
  Plus,
  CheckCircle2,
  Truck,
  Sprout,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { BuyerApi, resolveMediaUrl, type BuyerProduct } from '@/services/api';

const LOCAL_SELL_OFFERS_KEY = 'tandur_local_sell_offers';
const CART_STORAGE_KEY = 'tandur_buyer_cart';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<BuyerProduct | null>(null);
  const [quantityKg, setQuantityKg] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchDetail() {
      if (!id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await BuyerApi.getProductDetail(id);
        const detail = (res as any)?.data?.id ? (res as any).data : (res as any)?.id ? res : null;
        if (isMounted && detail) {
          const step = detail.min_order_quantity || detail.min_order_kg || 1;
          setProduct(detail);
          setQuantityKg(step);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fallback cek data penawaran stok lokal jika belum tersimpan di backend
      }

      if (isMounted) {
        try {
          const rawLocal = JSON.parse(localStorage.getItem(LOCAL_SELL_OFFERS_KEY) || '[]');
          if (Array.isArray(rawLocal)) {
            const foundLocal = rawLocal.find((item: any) => String(item.id) === String(id));
            if (foundLocal) {
              const offeredTons = Number(foundLocal.offered_tons ?? foundLocal.offer_ton ?? 0);
              const stockKg = Math.round(offeredTons * 1000);
              const minOrderTons = Number(foundLocal.min_order_tons ?? foundLocal.min_order_ton ?? 0.05);
              const minOrderKg = Math.max(25, Math.round(minOrderTons * 1000));
              const unitPrice = Number(foundLocal.selling_price_per_kg ?? foundLocal.price_per_kg ?? 0);

              const mappedProduct: BuyerProduct = {
                id: String(foundLocal.id),
                source: 'middleman',
                source_label: 'Mitra Gudang Tandur',
                name: `${foundLocal.commodity_name || 'Komoditas Panen'} (${foundLocal.variety || 'Standar Gudang'})`,
                commodity_name: foundLocal.commodity_name || 'Komoditas Panen',
                category_id: 'cat-local',
                category_name: foundLocal.category || 'Gabah',
                price: unitPrice,
                unit: 'kg',
                available_stock: stockKg,
                min_order_quantity: minOrderKg,
                is_preorder: false,
                seller: {
                  id: 'local-seller',
                  name: foundLocal.source_partner || 'Mitra Gudang Tandur',
                  role: 'middleman',
                  role_label: 'Mitra Gudang',
                  city: foundLocal.location || 'Gudang Mitra Tandur',
                  latitude: -6.89,
                  longitude: 110.63,
                },
                description: `Penawaran komoditas langsung dari ${foundLocal.location || 'Gudang Mitra Tandur'}. Metode pengambilan: ${foundLocal.pickup_method || 'Jemput di Gudang'}.`,
              };

              setProduct(mappedProduct);
              setQuantityKg(minOrderKg);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Abaikan parse error
        }

        setProduct(null);
        setIsLoading(false);
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] py-12 px-4 flex flex-col items-center justify-center text-center space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-[#236B37] animate-spin" />
        <p className="text-sm font-bold text-[#1A201A]">Memuat Detail Komoditas...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] py-12 px-4 sm:px-6 lg:px-8 text-[#1E241E] font-sans">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#ECE6DA] p-12 text-center space-y-4">
          <PackageOpen className="w-10 h-10 text-[#8A5A19] mx-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-[#1A201A]">
              Komoditas Tidak Ditemukan
            </h1>
            <p className="text-xs sm:text-sm text-[#6D756D]">
              Produk yang Anda cari sudah tidak tersedia atau telah terjual habis.
            </p>
          </div>
          <Link
            to="/produk"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog Produk
          </Link>
        </div>
      </div>
    );
  }

  const stepKg = product.min_order_quantity || product.min_order_kg || 1;
  const pPrice = product.price || product.price_per_kg || 0;
  const pStock = product.available_stock ?? product.stock_kg ?? 0;
  const pName = product.name || product.title || 'Komoditas Panen';
  const pUnit = product.unit || 'kg';
  const pSellerName = product.seller?.name || product.seller_name || 'Mitra Penjual';
  const pSellerLocation = product.seller?.city || product.seller?.address || product.seller_location || 'Demak';
  const pCategory = product.category_name || product.category || 'Komoditas';
  const pGrade = product.grade || product.source_label || 'Mutu Terverifikasi';
  const pImage = product.primary_image_url || product.image_url || product.media_urls?.[0];

  const subtotal = quantityKg * pPrice;

  const handleDecrease = () => {
    setQuantityKg((prev) => Math.max(stepKg, prev - stepKg));
  };

  const handleIncrease = () => {
    setQuantityKg((prev) => Math.min(pStock, prev + stepKg));
  };

  const handleAddToCart = async (redirectToCart = false) => {
    setIsSubmitting(true);
    try {
      await BuyerApi.addToCart(product.id, quantityKg, product.source);
    } catch {
      try {
        const rawCart = localStorage.getItem(CART_STORAGE_KEY);
        const currentCart = rawCart ? JSON.parse(rawCart) : [];
        const existingIdx = currentCart.findIndex(
          (c: any) => String(c.product_id) === String(product.id)
        );
        if (existingIdx >= 0) {
          currentCart[existingIdx].quantity += quantityKg;
          currentCart[existingIdx].subtotal =
            currentCart[existingIdx].quantity * pPrice;
        } else {
          currentCart.push({
            id: `cart-${Date.now()}`,
            product_id: product.id,
            product_name: pName,
            title: pName,
            seller_name: pSellerName,
            price_per_kg: pPrice,
            unit_price: pPrice,
            quantity: quantityKg,
            quantity_kg: quantityKg,
            unit: pUnit,
            subtotal,
          });
        }
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentCart));
      } catch {
        // Abaikan jika gagal menulis ke localStorage
      }
    } finally {
      setIsSubmitting(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'));
      }
    }

    if (redirectToCart) {
      navigate('/keranjang');
      return;
    }

    await Swal.fire({
      icon: 'success',
      title: 'Berhasil Masuk Keranjang',
      text: `${quantityKg} ${pUnit} ${pName} telah ditambahkan.`,
      timer: 1600,
      showConfirmButton: false,
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-[#1E241E] font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Breadcrumb */}
        <div>
          <Link
            to="/produk"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#236B37] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog Produk
          </Link>
        </div>

        {/* Main 2-Column Detail Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Product Info & Specs */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
            <div className="h-56 sm:h-64 bg-gradient-to-br from-[#DFF2E3] via-[#F4EFE6] to-[#F8EFE2] p-6 flex flex-col justify-between relative overflow-hidden">
              {pImage ? (
                <img
                  src={resolveMediaUrl(pImage)}
                  alt={pName}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              ) : null}

              <div className="relative z-10 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white text-[#236B37] text-xs font-bold shadow-2xs">
                  {pCategory}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#236B37] text-white text-xs font-bold">
                  {pGrade}
                </span>
              </div>

              <div className="relative z-10 inline-flex items-center gap-2 text-xs font-bold text-[#7D5318] bg-white/80 px-3 py-1 rounded-md w-fit">
                <Sprout className="w-4 h-4" />
                Panen Segar Langsung dari Lumbung Mitra Tandur
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A201A] leading-snug">
                  {pName}
                </h1>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#236B37]">
                    Rp {pPrice.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs sm:text-sm text-[#7A827A]">/ {pUnit}</span>
                  <span className="text-xs font-semibold text-[#8A5A19]">
                    • Tersedia {pStock.toLocaleString('id-ID')} {pUnit}
                  </span>
                </div>
              </div>

              <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#7A827A] block">Minimal Pembelian</span>
                  <strong className="text-[#1A201A] text-sm">
                    {stepKg} {pUnit}
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A827A] block">Metode Bayar</span>
                  <strong className="text-[#236B37] text-sm">
                    Cash on Pickup
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A827A] block">Sertifikasi Timbang</span>
                  <strong className="text-[#1A201A] text-sm">
                    Tera Digital Sah
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-[#1A201A]">
                  Deskripsi &amp; Spesifikasi Mutu
                </h2>
                <p className="text-xs sm:text-sm text-[#555D55] leading-relaxed">
                  {product.description || 'Komoditas panen terverifikasi dari mitra petani dan gudang Tandur.'}
                </p>
              </div>

              {/* Seller Info Card */}
              <div className="pt-4 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1A201A]">
                      {pSellerName}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#236B37]" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6D756D]">
                    <MapPin className="w-3.5 h-3.5 text-[#8A5A19]" />
                    <span>{pSellerLocation}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAF4EC] text-[#236B37] text-xs font-bold self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mitra Terverifikasi
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Sticky Order Box */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 bg-white rounded-2xl border border-[#ECE6DA] p-6 space-y-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
            <div>
              <h2 className="text-base font-bold text-[#1A201A]">
                Atur Jumlah Pembelian
              </h2>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Kelipatan {stepKg} {pUnit} sesuai standar kemasan
              </p>
            </div>

            {/* Quantity Stepper */}
            <div className="bg-[#F6F2EA] rounded-xl p-4 border border-[#EDE6D8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={quantityKg <= stepKg}
                  className="w-9 h-9 rounded-lg bg-white border border-[#DFD8CA] flex items-center justify-center text-[#1A201A] disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-24 text-center">
                  <span className="text-base font-bold text-[#1A201A]">
                    {quantityKg}
                  </span>{' '}
                  <span className="text-xs text-[#6D756D]">{pUnit}</span>
                </div>
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantityKg >= pStock}
                  className="w-9 h-9 rounded-lg bg-white border border-[#DFD8CA] flex items-center justify-center text-[#1A201A] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-right text-xs text-[#6D756D]">
                Setara <strong>{Math.max(1, Math.round(quantityKg / stepKg))} Paket</strong>
              </div>
            </div>

            {/* Subtotal Box */}
            <div className="bg-[#FAF8F3] rounded-xl p-4 border border-[#EFEAE0] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#6D756D]">
                <span>Harga Satuan</span>
                <span>Rp {pPrice.toLocaleString('id-ID')} / {pUnit}</span>
              </div>
              <div className="pt-2 border-t border-[#E6DFD2] flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A201A]">
                  Total Estimasi Bayar
                </span>
                <span className="text-xl font-bold text-[#236B37]">
                  Rp {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pickup Info Note */}
            <div className="flex items-start gap-2.5 text-xs text-[#555D55] bg-[#F4EFE6] p-3.5 rounded-xl">
              <Truck className="w-4 h-4 text-[#8A5A19] shrink-0 mt-0.5" />
              <span>
                Pembayaran dilakukan tunai di tempat setelah penimbangan ulang bersama petugas lumbung (<strong>Cash on Pickup</strong>).
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isSubmitting || pStock <= 0}
                onClick={() => handleAddToCart(true)}
                className="w-full py-3 px-5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                Pesan Sekarang (Ambil di Tempat)
              </button>

              <button
                type="button"
                disabled={isSubmitting || pStock <= 0}
                onClick={() => handleAddToCart(false)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] disabled:opacity-50 text-[#1A201A] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#236B37]" />
                + Tambah ke Keranjang
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A827A]">
              <Scale className="w-3.5 h-3.5 text-[#236B37]" />
              <span>Berat bersih dijamin sesuai hasil timbang digital</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;