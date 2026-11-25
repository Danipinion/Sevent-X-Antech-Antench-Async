import { Bell, CircleUserRound, Menu, Search } from "lucide-react";

export type DashboardUser = {
  name: string;
  /** Teks kecil di bawah nama, contoh: "Mitra Pembeli Demak" */
  subtitle: string;
};

type DashboardHeaderProps = {
  user: DashboardUser;
  /** Membuka sidebar (hanya tombol di layar kecil) */
  onMenuClick: () => void;
  /** Titik hijau di ikon lonceng */
  hasUnread?: boolean;
};

export const DashboardHeader = ({
  user,
  onMenuClick,
  hasUnread = true,
}: DashboardHeaderProps) => (
  <header
    className="
      sticky top-0 z-20 flex h-16 items-center gap-3
      border-b border-[#f0eae2] bg-[#fef8f0]/95 px-4 backdrop-blur
      sm:px-6 lg:h-[76px] lg:px-9
    "
  >
    {/* Tombol menu (mobile/tablet) */}
    <button
      type="button"
      onClick={onMenuClick}
      aria-label="Buka menu"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#4b534a] transition-colors hover:bg-[#f3ede5] lg:hidden"
    >
      <Menu size={20} />
    </button>

    {/* Pencarian */}
    <div className="relative min-w-0 max-w-[440px] flex-1">
      <Search
        size={15}
        strokeWidth={1.9}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b4bfb0]"
      />

      <input
        type="search"
        placeholder="Cari lokasi atau komoditas"
        className="
          h-9 w-full rounded-xl border border-[#f0ece7] bg-white
          pl-10 pr-3 text-[13px] text-[#2b2925]
          shadow-[0_1px_2px_rgba(60,40,20,0.04)]
          outline-none transition-all
          placeholder:text-[#a79a88]
          focus:border-[#2a7f3e] focus:ring-2 focus:ring-[#2a7f3e]/10
        "
      />
    </div>

    {/* Notifikasi + Profil.
        xl:mr-[16%] meniru jarak kanan di desain; hapus jika ingin rata ke tepi. */}
    <div className="ml-auto flex shrink-0 items-center xl:mr-[16%]">
      <button
        type="button"
        aria-label="Notifikasi"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#4b534a] transition-colors hover:bg-[#f3ede5]"
      >
        <Bell size={19} strokeWidth={1.8} />

        {hasUnread && (
          <span className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full bg-[#2a7f3e] ring-2 ring-[#fef8f0]" />
        )}
      </button>

      {/* Pemisah */}
      <span aria-hidden="true" className="mx-3 hidden h-7 w-px bg-[#eadfd2] sm:mx-5 sm:block" />

      <div className="ml-2 flex items-center gap-2.5 sm:ml-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f9f3eb]">
          <CircleUserRound size={20} strokeWidth={1.7} className="text-[#2a7f3e]" />
        </span>

        <div className="hidden text-left leading-tight sm:block">
          <p className="text-[13px] font-semibold text-[#1d1b17]">{user.name}</p>
          <p className="text-[11px] text-[#92693e]">{user.subtitle}</p>
        </div>
      </div>
    </div>
  </header>
);
