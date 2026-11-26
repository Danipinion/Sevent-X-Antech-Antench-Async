import { NavLink, useNavigate } from "react-router-dom";
import { BadgeCheck, LogOut, MapPin, X } from "lucide-react";
import Swal from "sweetalert2";
import type { MenuItem } from "./Menu";

type DashboardSidebarProps = {
    menu: MenuItem[];
    roleLabel: string;
    region?: string;
    footerNote?: string;
    open: boolean;
    onClose: () => void;
};

export const DashboardSidebar = ({
    menu,
    roleLabel,
    region,
    footerNote,
    open,
    onClose,
}: DashboardSidebarProps) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: "Konfirmasi Logout",
            text: "Apakah Anda yakin ingin Logout?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#b93838",
            cancelButtonColor: "#797e75",
            confirmButtonText: "Ya, Logout",
            cancelButtonText: "Batal",
        });

        if (result.isConfirmed) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("user");
            onClose();
            navigate("/login", { replace: true });
        }
    };

    return (
        <>
            {/* Overlay (hanya mobile/tablet) */}
            <div
                aria-hidden="true"
                onClick={onClose}
                className={`
            fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden
            ${open ? "opacity-100" : "pointer-events-none opacity-0"}
          `}
            />

            <aside
                aria-label="Menu utama"
                className={`
            fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col
            border-r border-[#f0eae2] bg-[#f9f3eb]
            transition-transform duration-300 ease-out
            lg:z-30 lg:w-64 lg:max-w-none lg:translate-x-0
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between pl-7 pr-6 pt-7">
                    <div className="flex items-center gap-3">
                        <img
                            src="/favicon.svg"
                            alt="Logo Tandur"
                            className="h-10 w-10 shrink-0 object-contain"
                        />

                        <div className="leading-tight">
                            <p className="text-[20px] font-bold text-[#026528]">Tandur</p>
                            <p className="text-[11px] text-[#91683e]">{roleLabel}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup menu"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4b534a] transition-colors hover:bg-[#f3ede5] lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Wilayah Kerja */}
                {region && (
                    <div className="pl-7 pr-6 pt-6">
                        <div className="flex items-center gap-2 rounded-xl bg-[#f3ede5] px-3 py-2.5">
                            <MapPin size={14} strokeWidth={1.9} className="shrink-0 text-[#835425]" />

                            <span className="text-[12px] font-semibold text-[#373530]">Wilayah Kerja</span>

                            <span className="ml-auto rounded-lg bg-[#d6ffd4] px-2.5 py-0.5 text-[11px] font-semibold text-[#1c783d]">
                                {region}
                            </span>
                        </div>
                    </div>
                )}

                {/* Menu */}
                <nav className="mt-5 flex-1 space-y-1.5 overflow-y-auto pl-7 pr-6">
                    {menu.map(({ label, to, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => `
                  flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2
                  text-[13px] transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7f3e]/30
                  ${isActive
                                    ? "bg-[#2a7f3e] font-medium text-white"
                                    : "text-[#4b534a] hover:bg-[#f3ede5]"
                                }
                `}
                        >
                            <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                            <span className="leading-snug">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Bagian Bawah: Tombol Logout & Footer Note */}
                <div className="mx-6 border-t border-[#f0e8dd] pb-6 pt-4 space-y-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-[13px] font-medium text-[#b93838] transition-colors hover:bg-[#fcebeb] cursor-pointer"
                    >
                        <LogOut size={16} strokeWidth={1.8} className="shrink-0 text-[#b93838]" />
                        <span className="leading-snug">Logout</span>
                    </button>

                    {footerNote && (
                        <div className="flex items-center gap-2 text-[12px] text-[#797e75] pl-1">
                            <BadgeCheck size={16} strokeWidth={1.8} className="shrink-0 text-[#408859]" />
                            <span>{footerNote}</span>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};