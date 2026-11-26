import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  Sprout,
  Filter,
  ShoppingCart,
  ArrowRight,
  SlidersHorizontal,
  Loader2,
  PackageOpen,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  BuyerApi,
  type BuyerProduct,
  type ProductCategory,
} from '@/services/api';

const LOCAL_SELL_OFFERS_KEY = 'tandur_local_sell_offers';

export const BuyerHomePage: React.FC = () => {
  const [products, setProducts] = useState<BuyerProduct[]>([]);
  const [popularProducts, setPopularProducts] = useState<BuyerProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchParams] = useSearchParams();
  const params = useParams();

  // 0. Sinkronisasi kategori & kata kunci pencarian dari parameter URL/Header
  useEffect(() => {
    const rawCat = searchParams.get('kategori') || searchParams.get('category') || params.category;
    if (rawCat) {
      const lower = rawCat.toLowerCase();
      if (lower.includes('beras') || lower.includes('gabah')) {
        setSelectedCategory('Beras & Gabah');
      } else if (lower.includes('sayur')) {
        setSelectedCategory('Sayur Segar');
      } else if (lower.includes('buah')) {
        setSelectedCategory('Buah Panen');
      } else if (lower.includes('ternak') || lower.includes('bibit')) {
        setSelectedCategory('Peternakan & Bibit');
      } else if (lower.includes('rempah') || lower.includes('bumbu')) {
        setSelectedCategory('Rempah & Bumbu');
      } else {
        setSelectedCategory(rawCat);
      }
    } else {
      setSelectedCategory('Semua');
    }

    const qParam = searchParams.get('search') || searchParams.get('q');
    if (qParam !== null && qParam !== undefined) {
      setSearchQuery(qParam);
    }
  }, [searchParams, params]);

  // 1. Fetch Daftar Kategori dari API (GET /api/v1/categories)
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await BuyerApi.getCategories();
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        if (isMounted && list.length > 0) {
          setCategories(list);
        }
      } catch {
        // Fallback default jika endpoint belum mengembalikan data
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Produk Terpopuler (GET /api/v1/products/popular)
  useEffect(() => {
    let isMounted = true;
    async function loadPopular() {
      try {
        const res = await BuyerApi.getPopularProducts();
        const list = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        if (isMounted && list.length > 0) {
          setPopularProducts(list);
        }
      } catch {
        // Fallback aman
      }
    }
    loadPopular();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Fetch Produk Utama (GET /api/v1/products)
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      let apiProducts: BuyerProduct[] = [];
      try {
        const selectedCatObj = categories.find(
          (c) => c.name === selectedCategory || c.id === selectedCategory || c.slug === selectedCategory
        );
        const categoryParam =
          selectedCategory === 'Semua'
            ? undefined
            : selectedCatObj?.id || selectedCatObj?.slug || selectedCategory;

        const res = await BuyerApi.getProducts({
          category_id: categoryParam,
          search: searchQuery || undefined,
        });

        const extracted = Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        apiProducts = extracted;
      } catch {
        // Fallback aman jika API gagal
      }

      // Gabungkan juga dengan stok yang ditawarkan aktif di penyimpanan lokal (jika ada)
      let localOffersAsProducts: BuyerProduct[] = [];
      try {
        const rawLocal = JSON.parse(localStorage.getItem(LOCAL_SELL_OFFERS_KEY) || '[]');
        if (Array.isArray(rawLocal)) {
          localOffersAsProducts = rawLocal
            .filter((item: any) => item.status !== 'closed')
            .map((item: any, idx: number) => {
              const offeredTons = Number(item.offered_tons ?? item.offer_ton ?? 0);
              const stockKg = Math.round(offeredTons * 1000);
              const minOrderTons = Number(item.min_order_tons ?? item.min_order_ton ?? 0.05);
              const minOrderKg = Math.max(25, Math.round(minOrderTons * 1000));
              const unitPrice = Number(item.selling_price_per_kg ?? item.price_per_kg ?? 0);

              return {
                id: String(item.id || `local-prod-${idx}`),
                source: 'middleman',
                source_label: 'Mitra Gudang Tandur',
                name: `${item.commodity_name || 'Komoditas Panen'} (${item.variety || 'Standar Gudang'})`,
                commodity_name: item.commodity_name || 'Komoditas Panen',
                category_id: 'cat-local',
                category_name: item.category || 'Gabah',
                price: unitPrice,
                unit: 'kg',
                available_stock: stockKg,
                min_order_quantity: minOrderKg,
                is_preorder: false,
                seller: {
                  id: 'local-seller',
                  name: item.source_partner || 'Mitra Gudang Tandur',
                  role: 'middleman',
                  role_label: 'Mitra Gudang',
                  city: item.location || 'Gudang Mitra Tandur',
                  latitude: -6.89,
                  longitude: 110.63,
                },
                description: `Penawaran langsung dari ${item.location || 'Gudang Mitra Tandur'}. Pengambilan: ${item.pickup_method || 'Jemput di Gudang'}.`,
              };
            });
        }
      } catch {
        // Abaikan parse error
      }

      const combined = [...apiProducts];
      for (const localProd of localOffersAsProducts) {
        if (!combined.some((p) => String(p.id) === String(localProd.id))) {
          combined.push(localProd);
        }
      }

      setProducts(combined);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const categoryPills = useMemo(() => {
    const list = [{ id: 'all', name: 'Semua', slug: 'all' }];
    if (categories.length > 0) {
      list.push(...categories);
    } else {
      const dynamicCats = Array.from(
        new Set(products.map((p) => p.category_name || p.category).filter(Boolean))
      );
      for (const dc of dynamicCats) {
        list.push({ id: dc as string, name: dc as string, slug: dc as string });
      }
    }
    return list;
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const catName = item.category_name || item.category || '';
      const matchCategory =
        selectedCategory === 'Semua' ||
        catName.toLowerCase() === selectedCategory.toLowerCase() ||
        catName.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory.toLowerCase().includes(catName.toLowerCase()) ||
        (selectedCategory.includes('Beras') && (catName.toLowerCase().includes('beras') || catName.toLowerCase().includes('gabah'))) ||
        (selectedCategory.includes('Sayur') && catName.toLowerCase().includes('sayur')) ||
        (selectedCategory.includes('Buah') && catName.toLowerCase().includes('buah')) ||
        (selectedCategory.includes('Bibit') && (catName.toLowerCase().includes('bibit') || catName.toLowerCase().includes('ternak'))) ||
        (selectedCategory.includes('Rempah') && (catName.toLowerCase().includes('rempah') || catName.toLowerCase().includes('bumbu'))) ||
        item.category_id === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCategory;

      const titleStr = item.name || item.title || '';
      const commStr = item.commodity_name || '';
      const sellerStr = item.seller?.name || item.seller_name || '';
      const locStr = item.seller?.city || item.seller?.address || item.seller_location || '';

      const matchSearch =
        titleStr.toLowerCase().includes(q) ||
        commStr.toLowerCase().includes(q) ||
        sellerStr.toLowerCase().includes(q) ||
        locStr.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleQuickAddCart = async (product: BuyerProduct) => {
    const minQty = product.min_order_quantity || product.min_order_kg || 1;
    const unitPrice = product.price || product.price_per_kg || 0;
    const title = product.name || product.title || 'Komoditas';

    try {
      await BuyerApi.addToCart(product.id, minQty, product.source);
    } catch {
      // Fallback simpan ke localStorage cart jika offline
      try {
        const rawCart = localStorage.getItem('tandur_buyer_cart');
        const currentCart = rawCart ? JSON.parse(rawCart) : [];
        const existingIdx = currentCart.findIndex(
          (c: any) => String(c.product_id) === String(product.id)
        );
        if (existingIdx >= 0) {
          currentCart[existingIdx].quantity += minQty;
          currentCart[existingIdx].subtotal =
            currentCart[existingIdx].quantity * unitPrice;
        } else {
          currentCart.push({
            id: `cart-${Date.now()}`,
            product_id: product.id,
            product_name: title,
            seller_name: product.seller?.name || product.seller_name || 'Mitra Penjual',
            unit_price: unitPrice,
            quantity: minQty,
            unit: product.unit || 'kg',
            subtotal: minQty * unitPrice,
          });
        }
        localStorage.setItem('tandur_buyer_cart', JSON.stringify(currentCart));
      } catch {
        // Abaikan jika localStorage gagal
      }
    }

    await Swal.fire({
      icon: 'success',
      title: 'Masuk Keranjang',
      text: `${minQty} ${product.unit || 'kg'} ${title} ditambahkan ke keranjang belanja.`,
      timer: 1600,
      showConfirmButton: false,
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1E241E] font-sans">
      {/* Hero Section */}
      <section className="bg-white border-b border-[#ECE6DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF4EC] text-[#236B37] text-xs font-bold">
                <Sprout className="w-3.5 h-3.5" />
                Pasar Tani Langsung • Bayar di Tempat (Cash on Pickup)
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1A201A] tracking-tight leading-tight">
                Hasil Panen Segar &amp; Beras Berkualitas Langsung dari Lumbung Petani
              </h1>
              <p className="text-xs sm:text-sm text-[#6D756D] leading-relaxed">
                Transparansi harga langsung dari petani, kelompok tani, dan gudang penggilingan terverifikasi. Timbang akurat dan ambil langsung di titik kumpul.
              </p>
            </div>

            <div className="bg-[#F6F2EA] rounded-2xl border border-[#E5DEC9] p-4 sm:p-5 space-y-2.5 shrink-0 lg:w-80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#236B37]">
                <ShieldCheck className="w-4 h-4" />
                Jaminan Mutu &amp; Tera Tandur
              </div>
              <p className="text-xs text-[#555D55] leading-relaxed">
                Semua mitra penjual telah terverifikasi identitas dan menggunakan timbangan digital berlabel tera sah.
              </p>
              <Link
                to="/keranjang"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A5A19] hover:underline pt-1"
              >
                Lihat Keranjang &amp; Jadwal Ambil
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-[#ECE6DA] p-4 sm:p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E968E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
                placeholder="Cari komoditas beras, gabah, palawija, penjual, atau lokasi..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:text-sm text-[#1A201A] placeholder-[#8E968E] focus:outline-none focus:border-[#236B37]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#4A524A]">
                <SlidersHorizontal className="w-4 h-4 text-[#236B37]" />
                <span>{filteredProducts.length} Produk Tersedia</span>
              </div>

              <button
                type="button"
                onClick={loadProducts}
                disabled={isLoading}
                className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F4EFE6] border border-[#E5DEC9] text-[#236B37] transition-colors cursor-pointer disabled:opacity-50"
                title="Muat ulang katalog"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D756D] mr-1">
              <Filter className="w-3.5 h-3.5" />
              Kategori:
            </span>
            {categoryPills.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id || cat.slug || cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#236B37] text-white shadow-sm'
                      : 'bg-[#F4EFE6] text-[#555D55] hover:bg-[#EAE2D3]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Rekomendasi Terpopuler (jika ada) */}
        {popularProducts.length > 0 && selectedCategory === 'Semua' && !searchQuery && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8A5A19]" />
              <h2 className="text-base font-bold text-[#1A201A]">
                Produk Terlaris Langsung dari Lumbung
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularProducts.slice(0, 3).map((pop) => {
                const popPrice = pop.price || pop.price_per_kg || 0;
                const popName = pop.name || pop.title || 'Komoditas';
                const popSeller = pop.seller?.name || pop.seller_name || 'Mitra Lumbung';
                const popCity = pop.seller?.city || pop.seller_location || 'Demak';

                return (
                  <Link
                    key={pop.id}
                    to={`/produk/${pop.id}`}
                    className="bg-white rounded-xl border border-[#ECE6DA] p-4 flex items-center gap-3.5 shadow-sm hover:border-[#236B37] transition-all"
                  >
                    <div className="w-14 h-14 rounded-lg bg-[#F4EFE6] flex items-center justify-center shrink-0 overflow-hidden">
                      {pop.primary_image_url || pop.image_url ? (
                        <img
                          src={pop.primary_image_url || pop.image_url}
                          alt={popName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="w-6 h-6 text-[#236B37]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#1A201A] truncate">
                        {popName}
                      </div>
                      <div className="text-xs font-extrabold text-[#236B37] mt-0.5">
                        Rp {popPrice.toLocaleString('id-ID')}
                        <span className="text-[10px] font-normal text-[#7A827A]">
                          /{pop.unit || 'kg'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6D756D] truncate mt-0.5">
                        {popSeller} • {popCity}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-14 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#236B37] animate-spin" />
            <p className="text-sm font-bold text-[#1A201A]">
              Memuat katalog komoditas segar...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ECE6DA] p-12 text-center space-y-2.5">
            <PackageOpen className="w-10 h-10 text-[#8A5A19] mx-auto" />
            <p className="text-base font-bold text-[#1A201A]">
              {products.length === 0
                ? 'Belum Ada Komoditas yang Dipasarkan'
                : 'Komoditas tidak ditemukan'}
            </p>
            <p className="text-xs text-[#6D756D] max-w-md mx-auto">
              {products.length === 0
                ? 'Saat ini belum ada listing hasil panen atau stok beras yang dibuka penjual.'
                : 'Coba ubah kata kunci pencarian atau pilih kategori lain.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const pTitle = product.name || product.title || 'Komoditas';
              const pPrice = product.price || product.price_per_kg || 0;
              const pUnit = product.unit || 'kg';
              const pStock = product.available_stock ?? product.stock_kg ?? 0;
              const pMinOrder = product.min_order_quantity ?? product.min_order_kg ?? 1;
              const pSellerName = product.seller?.name || product.seller_name || 'Mitra Penjual';
              const pLocation =
                product.seller?.city || product.seller?.address || product.seller_location || 'Demak';
              const pSourceLabel =
                product.source_label ||
                (product.source === 'farmer' ? 'Petani Mitra' : 'Mitra Tengkulak');
              const pCategory = product.category_name || product.category || 'Komoditas';

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#ECE6DA] overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:border-[#236B37]/40 transition-all"
                >
                  <div>
                    {/* Card Visual Banner */}
                    <div className="h-32 bg-gradient-to-br from-[#EAF4EC] via-[#F4EFE6] to-[#F8EFE2] p-4 flex flex-col justify-between relative overflow-hidden">
                      {product.primary_image_url || product.image_url ? (
                        <img
                          src={product.primary_image_url || product.image_url}
                          alt={pTitle}
                          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                        />
                      ) : null}

                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-white/90 text-[#236B37] text-[10px] font-bold shadow-xs">
                          {pCategory}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#236B37]/90 text-white text-[10px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {pSourceLabel}
                        </span>
                      </div>

                      <div className="relative z-10 text-[11px] font-bold text-[#7D5318] truncate">
                        {product.grade || 'Mutu Terverifikasi'}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2.5">
                      <Link
                        to={`/produk/${product.id}`}
                        className="block text-sm font-extrabold text-[#1A201A] hover:text-[#236B37] leading-snug line-clamp-2"
                      >
                        {pTitle}
                      </Link>

                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[#236B37]">
                          Rp {pPrice.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-[#7A827A]">/ {pUnit}</span>
                      </div>

                      <div className="pt-1 border-t border-[#F0EBE1] space-y-1 text-xs text-[#6D756D]">
                        <div className="font-semibold text-[#1A201A] truncate">
                          {pSellerName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-[#8A5A19] shrink-0" />
                          <span className="truncate">{pLocation}</span>
                        </div>
                        <div className="text-[11px] text-[#7A827A]">
                          Stok: <strong>{pStock.toLocaleString('id-ID')} {pUnit}</strong> • Min. {pMinOrder} {pUnit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                    <Link
                      to={`/produk/${product.id}`}
                      className="flex-1 text-center py-2 px-3 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-xs font-bold text-[#1A201A] transition-colors"
                    >
                      Detail
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleQuickAddCart(product)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors cursor-pointer"
                      title="Tambah ke Keranjang"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      + Keranjang
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BuyerHomePage;