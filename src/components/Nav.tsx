"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChefHat, Package, ShoppingCart, Sparkles, Crown, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";

const NAV = [
  { href: "/dashboard", label: "Beranda", icon: Home },
  { href: "/resep", label: "Resep", icon: ChefHat },
  { href: "/ai-chef", label: "AI Chef", icon: Sparkles },
  { href: "/stok", label: "Stok", icon: Package },
  { href: "/belanja", label: "Belanja", icon: ShoppingCart },
];

export default function Nav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-5xl -translate-x-1/2 border-t border-stone-200 bg-white pb-safe dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center py-2 pl-2 pr-1">
        <div className="flex flex-1 items-center justify-around">
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
                className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-coral"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 ${isActive ? "fill-coral/10" : ""}`}
                  />
                  {item.label === "AI Chef" && (
                    <Crown className="absolute -right-2 -top-1.5 h-3 w-3 text-amber-500" />
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </nav>
  );
}
