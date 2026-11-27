import { MapPin, Clock, Truck, Wallet, ShieldCheck } from "lucide-react";

const categories = [
  "Beras Kuning Giling",
  "Sayuran Organik",
  "Buah Musiman",
  "Jagung & Kedelai",
  "Bawang & Cabai Lokal",
  "Bibit & Sayuran",
];

const help = [
  "Cara Pemesanan Portal",
  "Tarif Ekspedisi Dingin",
  "Pengembalian Kendala",
  "Hubungi Tim Agronomi",
  "Kebijakan Privasi",
];

const shippingOptions = [
  "Kirim Langsung dari Petani",
  "Armada Pemasok",
  "Ambil di Lahan / Gudang",
];

const paymentOptions = [
  "COD (Bayar di Tempat)",
  "Cek Barang Baru Bayar",
];

export default function Footer() {
  return (
    <footer className="border-t border-[#ECE6DA] bg-white text-[#1C241E]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.25fr]">
          {/* Kolom 1: Brand & Kontak */}
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EC] p-1.5">
                <img
                  src="/favicon.svg"
                  alt="Logo Tandur"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="text-base font-extrabold tracking-tight text-[#156E33]">
                TANDUR <span className="font-semibold text-[#5C635E]">AGRIBISNIS</span>
              </span>
            </a>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#5C635E]">
              Platform niaga agribisnis hulu ke hilir yang menghubungkan petani lokal (Gapoktan)
              langsung dengan pembeli ritel, hotel, dan industri melalui rantai pasok yang
              transparan.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs text-[#5C635E]">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#156E33]" />
                <span>Jl. Raya Tani Makmur No. 12, Kota Madiun, Jawa Timur</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-[#156E33]" />
                <span>Layanan Pelanggan: 08.00 – 20.00 WIB</span>
              </li>
            </ul>
          </div>

          {/* Kolom 2: Kategori Panen */}
          <nav aria-label="Kategori Panen">
            <h3 className="text-sm font-bold text-[#1C241E]">Kategori Panen</h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#5C635E]">
              {categories.map((c) => (
                <li key={c}>
                  <a
                    href="#"
                    className="transition-colors hover:text-[#156E33] hover:underline"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kolom 3: Bantuan & Panduan */}
          <nav aria-label="Bantuan & Panduan">
            <h3 className="text-sm font-bold text-[#1C241E]">Bantuan &amp; Panduan</h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#5C635E]">
              {help.map((h) => (
                <li key={h}>
                  <a
                    href="#"
                    className="transition-colors hover:text-[#156E33] hover:underline"
                  >
                    {h}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kolom 4: Pengiriman & Pembayaran */}
          <div className="space-y-5">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1C241E]">
                <Truck className="h-4 w-4 text-[#156E33]" />
                Pengiriman
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shippingOptions.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] px-2.5 py-1 text-[11px] font-semibold text-[#2D332D]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1C241E]">
                <Wallet className="h-4 w-4 text-[#156E33]" />
                Pembayaran
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {paymentOptions.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-[#D4E9DA] bg-[#E8F5EC] px-2.5 py-1 text-[11px] font-semibold text-[#156E33]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#ECE6DA] bg-[#FAF8F3]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-[#6D756D] sm:flex-row sm:px-6 lg:px-8">
          <p>
            © 2026 Tandur Agribisnis Indonesia. Seluruh hak cipta dilindungi undang-undang.
          </p>
          <p className="inline-flex items-center gap-1.5 font-medium text-[#156E33]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Kedaulatan pangan dari desa.
          </p>
        </div>
      </div>
    </footer>
  );
}