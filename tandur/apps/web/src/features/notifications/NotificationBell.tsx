import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Package,
  FileText,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { fetchApi } from "@/services/api";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "order" | "stock" | "info";
  isRead: boolean;
  link?: string;
}

type NotificationBellProps = {
  /** Titik hijau paksa dari parent jika diperlukan */
  hasUnread?: boolean;
};

const READ_NOTIF_IDS_KEY = "tandur_read_notification_ids";

export const NotificationBell = ({ hasUnread }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getReadIds = (): string[] => {
      try {
        const raw = JSON.parse(localStorage.getItem(READ_NOTIF_IDS_KEY) || "[]");
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    };

    const loadNotifications = async () => {
      const readIds = getReadIds();
      const collected: NotificationItem[] = [];

      // 1. Ambil notifikasi dari backend API jika tersedia
      try {
        const res = await fetchApi<any>("/notifications");
        const apiList = Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        for (const item of apiList) {
          const id = String(item.id);
          collected.push({
            id,
            title: item.title || "Pemberitahuan Sistem",
            message: item.message || item.body || "",
            time: item.created_at
              ? new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                })
              : "Baru saja",
            type:
              item.type === "stock"
                ? "stock"
                : item.type === "order"
                ? "order"
                : "info",
            isRead: Boolean(item.is_read) || readIds.includes(id),
            link: item.link,
          });
        }
      } catch {
        // Lanjut kumpulkan dari aktivitas lokal bila endpoint belum tersedia
      }

      // 2. Deteksi otomatis aktivitas PO & stok menipis dari localStorage
      try {
        const localOrders = JSON.parse(
          localStorage.getItem("tandur_local_po_orders") || "[]"
        );
        if (Array.isArray(localOrders)) {
          localOrders.slice(0, 5).forEach((order: any) => {
            const id = `notif-po-${order.id}`;
            const statusText =
              order.status === "completed"
                ? "telah selesai & lunas"
                : order.status === "scheduled" || order.status === "in_transit"
                ? "telah dijadwalkan penjemputannya"
                : "menunggu konfirmasi";

            collected.push({
              id,
              title: `Pesanan PO ${order.po_number || order.id}`,
              message: `${order.commodity_name || "Komoditas"} (${Number(
                order.weight_kg || order.quantity || 0
              ).toLocaleString("id-ID")} kg) ${statusText}.`,
              time: order.created_at
                ? new Date(order.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                  })
                : "Terkini",
              type: "order",
              isRead: readIds.includes(id),
            });
          });
        }

        const localInventories = JSON.parse(
          localStorage.getItem("tandur_local_inventories") || "[]"
        );
        if (Array.isArray(localInventories)) {
          localInventories.forEach((inv: any) => {
            const stockKg = Number(inv.stock_kg || 0);
            const capKg = Number(inv.capacity_kg || 20000);
            const pct = capKg > 0 ? (stockKg / capKg) * 100 : 100;
            if (pct <= 40) {
              const id = `notif-inv-${inv.id}`;
              collected.push({
                id,
                title: `Peringatan Stok: ${inv.commodity_name || "Komoditas"}`,
                message: `Sisa stok di ${inv.location || "Gudang"} tinggal ${(
                  stockKg / 1000
                ).toFixed(1)} Ton (${pct.toFixed(0)}%).`,
                time: "Inventaris",
                type: "stock",
                isRead: readIds.includes(id),
              });
            }
          });
        }
      } catch {
        // Abaikan error parsing
      }

      if (isMounted) {
        setNotifications(collected);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const showDot =
    unreadCount > 0 || Boolean(hasUnread && notifications.length === 0);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    try {
      const existing = JSON.parse(
        localStorage.getItem(READ_NOTIF_IDS_KEY) || "[]"
      );
      const merged = Array.from(
        new Set([...(Array.isArray(existing) ? existing : []), ...allIds])
      );
      localStorage.setItem(READ_NOTIF_IDS_KEY, JSON.stringify(merged));
    } catch {
      // Abaikan
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClickNotification = (item: NotificationItem) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem(READ_NOTIF_IDS_KEY) || "[]"
      );
      const merged = Array.from(
        new Set([...(Array.isArray(existing) ? existing : []), item.id])
      );
      localStorage.setItem(READ_NOTIF_IDS_KEY, JSON.stringify(merged));
    } catch {
      // Abaikan
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const renderIcon = (type: NotificationItem["type"]) => {
    if (type === "stock") {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FDF3DC] text-[#9C651B]">
          <AlertTriangle size={15} />
        </span>
      );
    }
    if (type === "order") {
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF4EC] text-[#236B37]">
          <FileText size={15} />
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3EFE6] text-[#8A5A19]">
        <Package size={15} />
      </span>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[#4b534a] transition-colors hover:bg-[#f3ede5] cursor-pointer ${
          isOpen ? "bg-[#f3ede5] text-[#2a7f3e]" : ""
        }`}
      >
        <Bell size={19} strokeWidth={1.8} />

        {showDot && (
          <span className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full bg-[#2a7f3e] ring-2 ring-[#fef8f0]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-[#ECE6DA] bg-white shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between border-b border-[#F0EBE1] bg-[#FAF8F3] px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#1A201A]">
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#E1F3E5] px-2 py-0.5 text-[10px] font-bold text-[#236B37]">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#236B37] hover:underline cursor-pointer"
              >
                <CheckCheck size={13} />
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#F4EFE6]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F2EA] text-[#8A5A19]">
                  <Inbox size={18} />
                </div>
                <p className="text-xs font-bold text-[#1A201A]">
                  Belum Ada Notifikasi Baru
                </p>
                <p className="text-[11px] text-[#7A827A]">
                  Pembaruan pesanan PO, jadwal muat, dan status stok akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClickNotification(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[#FAF8F3] cursor-pointer ${
                    !notif.isRead ? "bg-[#F4FAF5]" : "bg-white"
                  }`}
                >
                  {renderIcon(notif.type)}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#1A201A] truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#8E968E] shrink-0">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5C645C] leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2a7f3e]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};