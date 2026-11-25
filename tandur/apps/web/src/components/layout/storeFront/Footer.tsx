import { MapPin, Clock } from "lucide-react";

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

const logistics = ["Tandur Fleet", "ColdChain Express", "Bango Tani"];
const payments = ["QRIS", "Transfer Bank", "Kredit Tani Mitra"];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <a href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg">
                <img src="/favicon.svg" alt="logo" />
              </span>
              <span className="text-sm font-extrabold tracking-tight text-green-800">
                TANDUR <span className="font-medium text-gray-500">AGRIBISNIS</span>
              </span>
            </a>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-gray-600">
              Platform niaga agribisnis kulu ke hilir yang menghubungkan petani lokal (Gapoktan)
              langsung dengan pembeli ritel, hotel, dan industri melalui rantai pasok yang
              transparan.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-green-700" />
                Jl. Raya Tani Makmur No. 12, Jakarta Selatan
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-green-700" />
                Layanan Pelanggan: 08.00 – 20.00 WIB
              </li>
            </ul>
          </div>

          {/* Kategori */}
          <nav aria-label="Kategori Panen">
            <h3 className="text-sm font-bold text-gray-900">Kategori Panen</h3>
            <ul className="mt-3 space-y-2 text-xs text-gray-600">
              {categories.map((c) => (
                <li key={c}>
                  <a href="#" className="hover:text-green-700 hover:underline">
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Bantuan */}
          <nav aria-label="Bantuan & Panduan">
            <h3 className="text-sm font-bold text-gray-900">Bantuan &amp; Panduan</h3>
            <ul className="mt-3 space-y-2 text-xs text-gray-600">
              {help.map((h) => (
                <li key={h}>
                  <a href="#" className="hover:text-green-700 hover:underline">
                    {h}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logistik */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900">Mitra Logistik</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {logistics.map((l) => (
                <li
                  key={l}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                >
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
          <span className="text-xs font-semibold text-gray-700">Pembayaran:</span>
          <ul className="flex flex-wrap gap-2">
            {payments.map((p) => (
              <li
                key={p}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-[11px] text-gray-500">
          © 2026 Tandur Agribisnis Indonesia. Seluruh hak cipta dilindungi undang-undang.
          Kedaulatan pangan dari desa.
        </p>
      </div>
    </footer>
  );
}