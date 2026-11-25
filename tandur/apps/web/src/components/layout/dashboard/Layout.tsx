import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardHeader, type DashboardUser } from "./Header";
import { DashboardSidebar } from "./Sidebar";
import type { MenuItem } from "./Menu";

type DashboardLayoutProps = {
  menu: MenuItem[];
  roleLabel: string;
  user: DashboardUser;
  region?: string;
  footerNote?: string;
  profileTo?: string;
};

export const DashboardLayout = ({
  menu,
  roleLabel,
  user,
  region,
  footerNote,
  profileTo,
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  // Tutup drawer saat pindah halaman
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Saat drawer terbuka: tombol Esc menutup, scroll halaman dikunci
  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#fef8f0] font-sans text-[#1d1b17]">
      <DashboardSidebar
        menu={menu}
        roleLabel={roleLabel}
        region={region}
        footerNote={footerNote}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Area konten, digeser selebar sidebar (256px) di desktop */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <DashboardHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          profileTo={profileTo}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
};