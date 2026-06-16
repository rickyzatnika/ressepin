"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChefHat, Package, ShoppingCart, Sparkles } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Beranda", icon: Home },
  { href: "/resep", label: "Resep", icon: ChefHat },
  { href: "/ai-chef", label: "AI Chef", icon: Sparkles },
  { href: "/stok", label: "Stok", icon: Package },
  { href: "/belanja", label: "Belanja", icon: ShoppingCart },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-5xl -translate-x-1/2 border-t border-stone-200 bg-white pb-safe">
      <div className="grid grid-cols-5 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/dashboard" && pathname === "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-coral"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "fill-coral/10" : ""}`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
