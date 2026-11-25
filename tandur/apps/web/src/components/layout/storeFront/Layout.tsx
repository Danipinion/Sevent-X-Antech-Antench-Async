import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children?: ReactNode;
  cartCount?: number;
}

export default function Layout({ children, cartCount }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-gray-900">
      <Header cartCount={cartCount} />
      <main className="w-full flex-1">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
}