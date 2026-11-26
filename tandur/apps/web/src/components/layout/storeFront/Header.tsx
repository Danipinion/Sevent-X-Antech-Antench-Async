import { useState } from "react";
import {
    Bell,
    ChevronDown,
    Menu,
    Search,
    ShieldCheck,
    ShoppingCart,
    User,
    X,
    MapPin,
} from "lucide-react";

const categories = [
    { label: "Beras & Gabah", href: "/kategori/beras-gabah" },
    { label: "Sayur Segar", href: "/kategori/sayur-segar" },
    { label: "Buah Panen", href: "/kategori/buah-panen" },
    { label: "Peternakan & Bibit", href: "/kategori/peternakan-bibit" },
    { label: "Rempah & Bumbu", href: "/kategori/rempah-bumbu" },
];

const topLinks = [
    { label: "Poin Berbasis Mitra Tani", href: "/mitra-tani" },
    { label: "Unduh Aplikasi", href: "/aplikasi" },
    { label: "Mulai Jual Hasil Panen", href: "/jual" },
];

export default function Header({ cartCount = 2 }: { cartCount?: number }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
            {/* Top promo bar */}
            <div className="bg-green-800 text-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[11px] sm:text-xs">
                    <p className="truncate">
                        Gratis Ongkir Pasar Raya se-seluruh Jawa &amp; Bali dengan min. belanja Rp200.000
                    </p>
                    <ul className="hidden items-center gap-4 md:flex">
                        {topLinks.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className="whitespace-nowrap hover:underline">
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main bar */}
            <div className="border-b border-stone-200/70 bg-[#f6f1e7]">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-6">
                    {/* Mobile menu toggle */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                        aria-expanded={menuOpen}
                        className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    {/* Logo */}
                    <a href="/" className="flex shrink-0 items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg ">
                            <img src="/favicon.svg" alt="logo" />
                        </span>
                        <span className="leading-none">
                            <span className="block text-base font-extrabold tracking-tight text-green-800 sm:text-lg">
                                TANDUR
                            </span>
                            <span className="block text-[9px] font-medium tracking-widest text-gray-500">
                                AGRIBISNIS
                            </span>
                        </span>
                    </a>

                    {/* Location */}
                    <button
                        type="button"
                        className="hidden shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left hover:bg-gray-50 lg:flex"
                    >
                        <MapPin size={18} className="text-green-700" />
                        <span className="leading-tight">
                            <span className="block text-[10px] text-gray-500">Kirim ke: Lokasi Akurat</span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-800">
                                Jakarta Selatan <ChevronDown size={12} />
                            </span>
                        </span>
                    </button>

                    {/* Search (desktop/tablet) */}
                    <form
                        role="search"
                        onSubmit={(e) => e.preventDefault()}
                        className="hidden h-10 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-green-700 focus-within:ring-2 focus-within:ring-green-700/20 md:flex"
                    >
                        <button
                            type="button"
                            className="flex h-full shrink-0 items-center gap-1 border-r border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Semua Produk <ChevronDown size={14} />
                        </button>
                        <input
                            type="search"
                            placeholder="Cari beras organik, sayur hidroponik, pupuk kompos..."
                            className="h-full min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            aria-label="Cari"
                            className="flex h-full w-12 shrink-0 items-center justify-center bg-green-700 text-white hover:bg-green-800"
                        >
                            <Search size={18} />
                        </button>
                    </form>

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
                        <a
                            href="/keranjang"
                            aria-label="Keranjang"
                            className="relative rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                        >
                            <ShoppingCart size={22} />
                            {cartCount > 0 && (
                                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                                    {cartCount}
                                </span>
                            )}
                        </a>
                        <a
                            href="/notifikasi"
                            aria-label="Notifikasi"
                            className="hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100 sm:block"
                        >
                            <Bell size={22} />
                        </a>
                        <a
                            href="/akun"
                            aria-label="Akun"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-800"
                        >
                            <User size={18} />
                        </a>
                    </div>
                </div>

                {/* Search (mobile) */}
                <form
                    role="search"
                    onSubmit={(e) => e.preventDefault()}
                    className="px-4 pb-3 md:hidden"
                >
                    <div className="flex h-10 items-center overflow-hidden rounded-lg border border-gray-300 focus-within:border-green-700">
                        <input
                            type="search"
                            placeholder="Cari beras organik, sayur, pupuk..."
                            className="h-full min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            aria-label="Cari"
                            className="flex h-full w-11 items-center justify-center bg-green-700 text-white"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </form>
            </div>

            {/* Category nav (desktop) */}
            <nav aria-label="Kategori" className="hidden border-b border-stone-200/70 bg-[#f6f1e7] md:block">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4">
                    <ul className="flex min-w-0 items-center gap-5 overflow-x-auto whitespace-nowrap text-sm lg:gap-7">
                        <li>
                            <button className="flex items-center gap-2 py-2.5 font-semibold text-gray-800 hover:text-green-700">
                                <Menu size={16} /> Semua Kategori <ChevronDown size={14} />
                            </button>
                        </li>
                        {categories.map((c) => (
                            <li key={c.href}>
                                <a href={c.href} className="block py-2.5 text-gray-600 hover:text-green-700">
                                    {c.label}
                                </a>
                            </li>
                        ))}
                        <li>
                            <a href="/promo" className="block py-2.5 font-semibold text-orange-600 hover:text-orange-700">
                                Promo Spesial
                            </a>
                        </li>
                    </ul>
                    <p className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-700 lg:flex">
                        <ShieldCheck size={16} className="text-green-700" />
                        Garansi Panen Segar 24 Jam
                    </p>
                </div>
            </nav>

            {/* Mobile drawer */}
            {menuOpen && (
                <nav aria-label="Menu mobile" className="border-b border-gray-100 bg-white md:hidden">
                    <ul className="mx-auto max-w-7xl divide-y divide-gray-100 px-4 text-sm">
                        <li className="flex items-center gap-2 py-3 text-gray-700">
                            <MapPin size={16} className="text-green-700" />
                            Kirim ke: <b>Jakarta Selatan</b>
                        </li>
                        {categories.map((c) => (
                            <li key={c.href}>
                                <a href={c.href} className="block py-3 text-gray-700 hover:text-green-700">
                                    {c.label}
                                </a>
                            </li>
                        ))}
                        <li>
                            <a href="/promo" className="block py-3 font-semibold text-orange-600">
                                Promo Spesial
                            </a>
                        </li>
                        {topLinks.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className="block py-3 text-gray-500">
                                    {l.label}
                                </a>
                            </li>
                        ))}
                        <li className="flex items-center gap-1.5 py-3 text-xs text-gray-600">
                            <ShieldCheck size={16} className="text-green-700" />
                            Garansi Panen Segar 24 Jam
                        </li>
                    </ul>
                </nav>
            )}
        </header>
    );
}