"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Crown, Lock, Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
  feature: string;
  description?: string;
}

export default function PremiumGuard({ children, feature, description }: Props) {
  const { data: session } = useSession();
  const premiumStatus = useQuery(api.users.getPremiumStatus, {
    googleId: session?.user?.id || "",
  });

  if (!premiumStatus) return <>{children}</>;
  if (premiumStatus.isPremium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 p-6 backdrop-blur-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Crown className="h-7 w-7 text-amber-600" />
        </div>
        <p className="text-center text-lg font-bold text-stone-800">
          Fitur Premium
        </p>
        <p className="max-w-xs text-center text-sm text-stone-500">
          {description || `Buka ${feature} dan fitur eksklusif lainnya dengan langganan Premium.`}
        </p>
        <Link
          href="/premium"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Jadi Premium
        </Link>
        <p className="text-xs text-stone-400">Mulai Rp25.000/bulan</p>
      </div>
    </div>
  );
}
