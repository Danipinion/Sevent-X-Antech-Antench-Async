import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  X,
  TrendingUp,
  Info,
  Sparkles,
  Warehouse,
  Plus,
  Loader2,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
} from 'lucide-react';
import { FarmerApi, MiddlemanApi, resolveMediaUrl } from '@/services/api';

const COMMODITY_PRESETS: { name: string; url: string }[] = [
  {
    name: 'Beras Medium',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Beras Premium',
    url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Beras SPHP Bulog',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Gabah GKP',
    url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Jagung Pipil',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Cabai Rawit',
    url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Bawang Merah',
    url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
  },
];

const getDefaultImageForCommodity = (name?: string): string => {
  if (!name) return COMMODITY_PRESETS[0].url;
  const match = COMMODITY_PRESETS.find(
    (p) =>
      name.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(name.toLowerCase())
  );
  return match ? match.url : COMMODITY_PRESETS[0].url;
};

export interface LotOption {
  id: string;
  lotCode: string;
  name: string;
  availableTon: number;
  subText: string;
  costLabel: string;
  costPerKg: number;
  marketRefPerKg: number;
  category?: string;
}

interface OpenSellOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish?: (data: any) => void;
  availableLots?: LotOption[];
}

export const OpenSellOfferModal: React.FC<OpenSellOfferModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  availableLots,
}) => {
  const [lots, setLots] = useState<LotOption[]>([]);
  const [selectedLot, setSelectedLot] = useState<LotOption | null>(null);
  const [targetSegment, setTargetSegment] = useState<'b2b' | 'b2c'>('b2b');
  const [offerTon, setOfferTon] = useState<number>(0);
  const [minOrderTon, setMinOrderTon] = useState<number>(1.0);
  const [offerKg, setOfferKg] = useState<number>(500);
  const [minOrderKg, setMinOrderKg] = useState<number>(5);
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [pickupMethod, setPickupMethod] = useState<'fob' | 'cdd'>('fob');
  const [targets, setTargets] = useState({
    riceMill: true,
    wholesaler: true,
    openB2B: false,
  });
  const [validity, setValidity] = useState('3 Hari (Rekomendasi Pasar Aktif)');
  const [isLoadingLots, setIsLoadingLots] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      try {
        const res = await FarmerApi.uploadMedia(file);
        if (res?.url) {
          setImageUrl(res.url);
          setIsUploadingImage(false);
          return;
        }
      } catch {
        // Fallback convert to data URL so user can still preview & post
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
        setIsUploadingImage(false);
      };
      reader.onerror = () => setIsUploadingImage(false);
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (availableLots && availableLots.length > 0) {
      setLots(availableLots);
      setSelectedLot(availableLots[0]);
      setOfferTon(Math.min(availableLots[0].availableTon, 10.0));
      setOfferPrice(availableLots[0].marketRefPerKg || availableLots[0].costPerKg);
      setImageUrl(getDefaultImageForCommodity(availableLots[0].name));
      setIsLoadingLots(false);
      return;
    }

    async function fetchLots() {
      setIsLoadingLots(true);
      try {
        let loadedItems: any[] = [];
        try {
          const res = await MiddlemanApi.getInventories();
          const list = Array.isArray((res as any)?.data?.items)
            ? (res as any).data.items
            : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray(res)
            ? res
            : [];
          if (list.length > 0) loadedItems = list;
        } catch {
          // ignore
        }

        try {
          const raw = JSON.parse(localStorage.getItem('tandur_local_inventories') || '[]');
          if (Array.isArray(raw)) {
            loadedItems = [...raw, ...loadedItems];
          }
        } catch {
          // ignore
        }

        const unique = new Map<string, any>();
        loadedItems.forEach((item) => {
          const key = item.batch_code || item.id;
          if (!unique.has(key)) unique.set(key, item);
        });

        const mapped: LotOption[] = [];
        Array.from(unique.values()).forEach((inv, idx) => {
          const stockKg = Number(inv.stock_kg ?? inv.weight_kg ?? inv.total_weight_kg ?? 0);
          const ton = stockKg / 1000;
          if (ton > 0) {
            const buyPrice = Number(inv.avg_buy_price ?? inv.buy_price_per_kg ?? 0);
            const marketRef = Number(inv.market_ref_price ?? inv.market_price_per_kg ?? buyPrice);
            const commodityName = inv.commodity_name || 'Komoditas Gudang';
            const batchCode = inv.batch_code || inv.lot_code || `#BATCH-${idx + 1}`;

            mapped.push({
              id: String(inv.id || batchCode),
              lotCode: batchCode,
              name: commodityName,
              availableTon: ton,
              subText: `Tersedia: ${ton.toFixed(1)} Ton (Stok Gudang)`,
              costLabel: 'Modal Beli:',
              costPerKg: buyPrice,
              marketRefPerKg: marketRef,
              category: inv.category,
            });
          }
        });

        setLots(mapped);
        if (mapped.length > 0) {
          const first = mapped[0];
          setSelectedLot(first);
          setOfferTon(Math.min(first.availableTon, 10.0));
          setOfferPrice(first.marketRefPerKg || first.costPerKg);
          setImageUrl((prev) => prev || getDefaultImageForCommodity(first.name));
        } else {
          setSelectedLot(null);
          setOfferTon(0);
          setOfferPrice(0);
        }
      } finally {
        setIsLoadingLots(false);
      }
    }

    fetchLots();
  }, [isOpen, availableLots]);

  if (!isOpen) return null;

  const handleSelectLot = (lot: LotOption) => {
    setSelectedLot(lot);
    setOfferTon(Math.min(10.0, lot.availableTon));
    setOfferPrice(lot.marketRefPerKg || lot.costPerKg);
    setImageUrl(getDefaultImageForCommodity(lot.name));
  };

  const availableTon = selectedLot?.availableTon || 0;
  const availableKg = Math.round(availableTon * 1000);
  const effectiveOfferTon = targetSegment === 'b2b' ? offerTon : offerKg / 1000;
  const effectiveMinOrderTon = targetSegment === 'b2b' ? minOrderTon : minOrderKg / 1000;
  const remainingTon = Math.max(0, availableTon - effectiveOfferTon);
  const totalKg = Math.round(effectiveOfferTon * 1000);
  const grossValue = totalKg * offerPrice;
  const costPerKg = selectedLot?.costPerKg || 0;
  const marginPerKg = offerPrice - costPerKg;
  const marginPercent = costPerKg > 0 ? ((marginPerKg / costPerKg) * 100).toFixed(1) : '0.0';
  const netProfit = totalKg * marginPerKg;

  const formatRupiah = (val: number) => 'Rp ' + (Number(val) || 0).toLocaleString('id-ID');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    onPublish?.({
      selectedLot,
      targetSegment,
      offerTon: effectiveOfferTon,
      minOrderTon: effectiveMinOrderTon,
      minOrderKg: targetSegment === 'b2c' ? minOrderKg : Math.round(effectiveMinOrderTon * 1000),
      offerPrice,
      pickupMethod,
      targets,
      validity,
      imageUrl: imageUrl || (selectedLot ? getDefaultImageForCommodity(selectedLot.name) : ''),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#ECE6DA] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EFEAE0] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] text-[#236B37] flex items-center justify-center shrink-0 mt-0.5">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A201A]">
                  Buka Penawaran Jual Baru
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E1F3E5] text-[#236B37] text-[11px] font-bold">
                  Listing Pasar
                </span>
              </div>
              <p className="text-xs text-[#6D756D] mt-0.5">
                Tawarkan stok komoditas dari gudang Anda ke mitra pabrik beras (rice mill) dan pedagang grosir terverifikasi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6D756D] hover:text-[#1A201A] hover:bg-[#F4EFE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoadingLots ? (
          <div className="p-12 text-center text-xs text-[#6D756D] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#236B37]" />
            <span>Memeriksa stok komoditas di gudang...</span>
          </div>
        ) : lots.length === 0 ? (
          <div className="p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8F3] border border-[#EFEAE0] text-[#8A5A19] flex items-center justify-center mx-auto">
              <Warehouse className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#1A201A]">
              Belum Ada Stok Gudang Siap Jual
            </h3>
            <p className="text-xs text-[#6D756D] max-w-md mx-auto leading-relaxed">
              Saat ini gudang Anda belum memiliki stok komoditas yang tercatat (0 Ton). Silakan tambahkan stok penerimaan panen terlebih dahulu di menu <strong>Inventaris Stok Gudang</strong> agar dapat membuka penawaran jual ke pasar.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/middleman/inventaris"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Ke Inventaris Stok Gudang
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E2DACB] text-xs font-semibold text-[#1A201A] hover:bg-[#EFEAE0] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {/* 1. Pilih Komoditas */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1A201A]">1. Pilih Komoditas dari Stok Gudang</span>
                <span className="text-[11px] text-[#7A827A]">
                  Total {lots.length} Lot Siap Jual
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lots.map((lot) => {
                  const isSelected = selectedLot?.id === lot.id;
                  return (
                    <button
                      type="button"
                      key={lot.id}
                      onClick={() => handleSelectLot(lot)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#F3F9F4] border-[#236B37] ring-1 ring-[#236B37]'
                          : 'bg-[#FAF8F3] border-[#E5DEC9] hover:border-[#C5BCA8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#8A5A19]">
                          {lot.lotCode}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#236B37]' : 'border-[#C5BCA8]'
                          }`}
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#236B37]" />}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-[#1A201A] mt-1">
                        {lot.name}
                      </div>
                      <div className="text-[11px] text-[#6D756D] mt-0.5">{lot.subText}</div>
                      <div className="mt-3 pt-2 border-t border-[#E6DFD2] flex items-center justify-between text-[10px]">
                        <span className="text-[#7A827A]">{lot.costLabel}</span>
                        <strong className="text-[#1A201A]">{formatRupiah(lot.costPerKg)}/kg</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target Pasar & Volume */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-xs text-[#1A201A]">2. Target Pasar &amp; Volume Penawaran</span>
                {/* Segment Selector: B2B Ton vs B2C Kg */}
                <div className="inline-flex p-1 rounded-xl bg-[#F4EFE6] border border-[#E8E2D5] gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTargetSegment('b2b')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetSegment === 'b2b'
                        ? 'bg-[#236B37] text-white shadow-xs'
                        : 'text-[#6D756D] hover:text-[#236B37]'
                    }`}
                  >
                    🏢 Partai Besar / B2B (Ton)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSegment('b2c')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetSegment === 'b2c'
                        ? 'bg-[#8A5A19] text-white shadow-xs'
                        : 'text-[#6D756D] hover:text-[#8A5A19]'
                    }`}
                  >
                    🛒 Eceran Rumah Tangga (Kg)
                  </button>
                </div>
              </div>

              {targetSegment === 'b2b' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2D332D]">Tonase Ditawarkan (Ton)</span>
                      <span className="text-[11px] text-[#7A827A]">
                        Maks: {availableTon.toFixed(1)} Ton
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max={availableTon}
                        value={offerTon}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setOfferTon(Math.min(availableTon, val));
                        }}
                        className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                        Ton
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A827A]">
                      Sisa di gudang: {remainingTon.toFixed(1)} Ton
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2D332D]">Minimal Order (Ton)</span>
                      <span className="text-[11px] text-[#7A827A]">Grosir / Pabrik</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max={offerTon}
                        value={minOrderTon}
                        onChange={(e) => setMinOrderTon(parseFloat(e.target.value) || 0)}
                        className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                        Ton
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A827A]">Pabrik beras &amp; pedagang grosir</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2D332D]">Volume Dijual Eceran (Kg)</span>
                      <span className="text-[11px] text-[#7A827A]">
                        Maks: {availableKg.toLocaleString('id-ID')} Kg
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        min="1"
                        max={availableKg}
                        value={offerKg}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setOfferKg(Math.min(availableKg, val));
                        }}
                        className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                        Kg
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A827A]">
                      Setara {(offerKg / 1000).toFixed(2)} Ton dari stok gudang
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2D332D]">Minimal Beli Konsumen (Kg)</span>
                      <span className="text-[11px] text-[#7A827A]">Eceran Rumah Tangga</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max={offerKg}
                        value={minOrderKg}
                        onChange={(e) => setMinOrderKg(parseInt(e.target.value, 10) || 1)}
                        className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs sm:text-sm font-bold text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                        Kg
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A827A]">Mendukung pembelian rumah tangga (1, 5, 10 kg)</p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Penetapan Harga & Smart Margin */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#1A201A]">3. Penetapan Harga & Smart Margin</span>
                {selectedLot?.marketRefPerKg ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A5A19]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Acuan Pasar SP2KP: {formatRupiah(selectedLot.marketRefPerKg)} / kg
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[11px] text-[#6D756D]">
                    Harga Penawaran / kg
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#236B37]">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="50"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(Number(e.target.value) || 0)}
                      className="w-full pl-9 pr-10 py-3 rounded-xl bg-[#F3F9F4] border border-[#236B37] text-sm font-bold text-[#1A201A] focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#7A827A]">
                      /kg
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-7 bg-[#FAF8F3] rounded-xl p-3.5 border border-[#E5DEC9] flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[#6D756D]">
                      Modal Beli: {formatRupiah(costPerKg)}/kg
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#E1F3E5] text-[#236B37] font-bold">
                      Margin {marginPerKg >= 0 ? '+' : ''}{formatRupiah(marginPerKg)}/kg ({marginPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#EAE2D3] flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-[#7A827A]">Nilai Kotor Transaksi</div>
                      <div className="text-sm font-bold text-[#1A201A]">
                        {formatRupiah(grossValue)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#7A827A]">Estimasi Laba Bersih</div>
                      <div className="text-sm font-bold text-[#236B37]">
                        {netProfit >= 0 ? '+' : ''}{formatRupiah(netProfit)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Opsi Pengambilan & Logistik */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1A201A]">
                4. Opsi Pengambilan & Logistik
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPickupMethod('fob')}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pickupMethod === 'fob'
                      ? 'bg-[#F3F9F4] border-[#236B37]'
                      : 'bg-[#FAF8F3] border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1A201A]">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        pickupMethod === 'fob' ? 'border-[#236B37]' : 'border-[#B8B0A0]'
                      }`}
                    >
                      {pickupMethod === 'fob' && (
                        <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                      )}
                    </span>
                    Ambil di Gudang Tengkulak (FOB Gudang)
                  </div>
                  <p className="text-[11px] text-[#6D756D] mt-1 pl-5">
                    Truk dan armada angkut disediakan oleh pembeli sendiri
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPickupMethod('cdd')}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pickupMethod === 'cdd'
                      ? 'bg-[#F3F9F4] border-[#236B37]'
                      : 'bg-[#FAF8F3] border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1A201A]">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        pickupMethod === 'cdd' ? 'border-[#236B37]' : 'border-[#B8B0A0]'
                      }`}
                    >
                      {pickupMethod === 'cdd' && (
                        <span className="w-2 h-2 rounded-full bg-[#236B37]" />
                      )}
                    </span>
                    Kirim Armada Logistik Tengkulak
                  </div>
                  <p className="text-[11px] text-[#6D756D] mt-1 pl-5">
                    Biaya kirim ditagihkan ke invoice pembeli
                  </p>
                </button>
              </div>
            </div>

            {/* 5. Foto Komoditas & Bukti Fisik Stok Gudang */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#1A201A] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#236B37]" />
                  <span>5. Foto Komoditas &amp; Bukti Fisik Stok Gudang</span>
                  <span className="text-[10px] text-[#236B37] font-semibold bg-[#EAF4EC] px-1.5 py-0.5 rounded">
                    Tampil di Katalog Pembeli
                  </span>
                </div>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset Foto
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#FAF8F3] border border-[#E5DEC9] p-3 rounded-xl">
                {/* Image Preview Box */}
                <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-[#D5CDBC] bg-[#ECE6DA] flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={resolveMediaUrl(imageUrl)}
                      alt="Pratinjau Komoditas"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-[#7A827A]">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-[#9E988B]" />
                      <span className="text-[10px] block">Belum ada foto</span>
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-[10px] mt-1 font-semibold">Mengunggah...</span>
                    </div>
                  )}
                </div>

                {/* Upload & Preset Options */}
                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#236B37] text-[#236B37] hover:bg-[#F3F9F4] text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {imageUrl ? 'Ganti Foto dari Perangkat' : 'Unggah Foto dari Perangkat'}
                    </button>
                    <span className="text-[11px] text-[#7A827A]">
                      Format JPG, PNG, atau WEBP maks 5MB
                    </span>
                  </div>

                  {/* Preset chips */}
                  <div>
                    <span className="text-[11px] text-[#6D756D] block mb-1 font-medium">
                      Atau pilih foto standar komoditas riil:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMODITY_PRESETS.map((preset) => {
                        const isSelected = imageUrl === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setImageUrl(preset.url)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-[#236B37] text-white border-[#236B37]'
                                : 'bg-white text-[#2D332D] border-[#D5CDBC] hover:border-[#236B37]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 & 7 Target Pasar & Masa Berlaku */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#1A201A]">
                  6. Target Pasar yang Diberitahu
                </div>
                <div className="space-y-2 text-xs text-[#2D332D]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targets.riceMill}
                      onChange={(e) => setTargets({ ...targets, riceMill: e.target.checked })}
                      className="rounded accent-[#236B37]"
                    />
                    <span>Pabrik Beras / Modern Rice Mill (Mitra Industri)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targets.wholesaler}
                      onChange={(e) => setTargets({ ...targets, wholesaler: e.target.checked })}
                      className="rounded accent-[#236B37]"
                    />
                    <span>Pedagang Grosir &amp; Pasar Induk</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targets.openB2B}
                      onChange={(e) => setTargets({ ...targets, openB2B: e.target.checked })}
                      className="rounded accent-[#236B37]"
                    />
                    <span>Pembeli Terbuka di Portal Tandur B2B</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#1A201A]">
                  7. Masa Berlaku Penawaran
                </div>
                <select
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2DACB] text-xs font-medium text-[#1A201A] focus:outline-none focus:border-[#236B37]"
                >
                  <option>3 Hari (Rekomendasi Pasar Aktif)</option>
                  <option>7 Hari (Kontrak Mingguan)</option>
                  <option>24 Jam (Penawaran Kilat)</option>
                </select>
                <div className="flex items-center gap-1.5 text-[11px] text-[#7A827A]">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Otomatis ditutup bila kuota {offerTon.toFixed(1)} Ton habis terpesan.</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#EFEAE0] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#2D332D] text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-[#6D756D]">
                  Status: Listing Langsung Aktif
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#236B37] hover:bg-[#1B552B] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  + Terbitkan Penawaran Sekarang
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OpenSellOfferModal;
