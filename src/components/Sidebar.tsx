"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Sheet,
  Shirt,
  Images,
  Package,
  ShoppingBag,
  Users,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";

interface UserProp {
  id: string;
  name: string;
  email: string;
  role: string;
}

const navItems = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trợ lý AI", href: "/ai", icon: Bot },
  { label: "Bảng tính", href: "/workbooks", icon: Sheet },
  { label: "Sản phẩm", href: "/products", icon: Shirt },
  { label: "Thư viện ảnh", href: "/media", icon: Images },
  { label: "Kho hàng", href: "/inventory", icon: Package },
  { label: "Đơn hàng", href: "/orders", icon: ShoppingBag },
  { label: "Khách hàng", href: "/customers", icon: Users },
  { label: "Tài chính", href: "/finance", icon: Wallet },
  { label: "Người dùng & phân quyền", href: "/settings", icon: Settings, adminOnly: true },
];

export default function Sidebar({ user }: { user: UserProp }) {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 bg-[#102b4c] text-white p-5 flex flex-col justify-between min-h-screen flex-shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-xl font-black tracking-tight">BIZWORK</div>
        </div>
        <p className="text-xs text-blue-200 mt-0.5">Business workspace</p>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
              return null;
            }
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-blue-300"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/20 pt-4 mt-8">
        <p className="text-sm font-semibold truncate">{user.name}</p>
        <span className="inline-block px-2 py-0.5 mt-1 rounded text-[11px] font-mono font-bold bg-blue-900/60 text-blue-200 border border-blue-400/30">
          {user.role}
        </span>

        <form action="/api/auth/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-slate-300 hover:text-rose-300 transition py-1"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
