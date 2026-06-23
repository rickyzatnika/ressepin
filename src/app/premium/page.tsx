"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Crown,
  Sparkles,
  Check,
  X,
  ChevronRight,
  Loader2,
  Star,
  Zap,
  ClipboardList,
  Search,
  Video,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

const FREE_FEATURES = [
  { icon: Search, label: "AI Chef Chat (dasar)" },
  { icon: Video, label: "Ekstrak Resep YouTube" },
  { icon: ShoppingCart, label: "Stok & Belanja" },
  { icon: ClipboardList, label: "1× Meal Plan Gratis" },
];

const PREMIUM_FEATURES = [
  { icon: Search, label: "AI Chef + Cari Web (resep akurat)" },
  { icon: Video, label: "Ekstrak Resep YouTube" },
  { icon: ShoppingCart, label: "Stok & Belanja" },
  { icon: ClipboardList, label: "Meal Plan Tak Terbatas" },
  { icon: Star, label: "Prioritas AI response" },
  { icon: Zap, label: "Fitur premium mendatang" },
];

export default function PremiumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const premiumStatus = useQuery(api.users.getPremiumStatus, {
    googleId: session?.user?.id || "",
  });
  const activatePremium = useMutation(api.users.activatePremium);

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  async function handlePromoActivate() {
    if (!promoCode.trim() || !session?.user?.id) return;

    const VALID_CODES = ["RESEPIN PREMIUM", "COBA PREMIUM", "PREMIUM GRATIS", "SELAMAT DATANG"];

    if (!VALID_CODES.includes(promoCode.toUpperCase().trim())) {
      setPromoError("Kode promo tidak valid");
      return;
    }

    setActivating(true);
    setPromoError("");
    try {
      await activatePremium({ googleId: session.user.id });
      setActivated(true);
    } catch {
      setPromoError("Gagal aktivasi, coba lagi");
    } finally {
      setActivating(false);
    }
  }

  async function handlePaymentSuccess() {
    if (!session?.user?.id) return;
    setActivating(true);
    try {
      await activatePremium({ googleId: session.user.id });
      setActivated(true);
      setShowPayment(false);
    } catch {
      setPromoError("Gagal aktivasi, coba lagi");
    } finally {
      setActivating(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  if (activated || premiumStatus?.isPremium) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Kamu Premium! 🎉</h1>
        <p className="mb-8 max-w-sm text-stone-500 dark:text-stone-400">
          Nikmati semua fitur eksklusif ResepIn tanpa batas.
        </p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl bg-coral px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark"
        >
          Lanjut ke Dashboard
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6 pb-24">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
          <Crown className="h-7 w-7 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Jadi Chef Premium
        </h1>
        <p className="mx-auto max-w-sm text-sm text-stone-500 dark:text-stone-400">
          Buka fitur eksklusif AI Chef + Meal Planner tak terbatas untuk pengalaman masak maksimal.
        </p>
      </div>

      {/* Feature Comparison */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {/* Free Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-1 text-sm font-semibold text-stone-600 dark:text-stone-300">Gratis</h3>
          <p className="mb-4 text-2xl font-bold">
            Rp0
            <span className="text-sm font-normal text-stone-400 dark:text-stone-400"> / bulan</span>
          </p>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map((f, i) => {
              const isPremium = i === 0;
              const Icon = f.icon;
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
                  {isPremium ? (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  ) : (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  )}
                  <span className={isPremium ? "text-stone-400 dark:text-stone-400" : ""}>{f.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Premium Card */}
        <div className="relative rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white p-5 shadow-lg shadow-amber-500/10 dark:from-stone-800 dark:to-stone-800">
          <div className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Rekomendasi
          </div>
          <h3 className="mb-1 text-sm font-semibold text-amber-700">Premium</h3>
          <p className="mb-4">
            <span className="text-2xl font-bold">Rp25K</span>
            <span className="text-sm text-stone-400 dark:text-stone-400"> / bulan</span>
          </p>
          <ul className="space-y-2.5">
            {PREMIUM_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {f.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
          Pilih Paket
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => { setSelectedPlan("monthly"); setShowPayment(true); }}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${
              selectedPlan === "monthly"
                ? "border-amber-400 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-600"
            }`}
          >
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Bulanan</p>
            <p className="text-lg font-bold">
              Rp25.000
              <span className="text-sm font-normal text-stone-400 dark:text-stone-400"> /bln</span>
            </p>
          </button>
          <button
            onClick={() => { setSelectedPlan("yearly"); setShowPayment(true); }}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${
              selectedPlan === "yearly"
                ? "border-amber-400 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-600"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Tahunan</p>
              <span className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-bold text-sage-dark">
                Hemat 17%
              </span>
            </div>
            <p className="text-lg font-bold">
              Rp250.000
              <span className="text-sm font-normal text-stone-400 dark:text-stone-400"> /thn</span>
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-400">≈ Rp20.833/bln</p>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-800">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Pilih Pembayaran</h3>
              <button
                onClick={() => setShowPayment(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-700 dark:text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">
              {selectedPlan === "monthly" ? "Rp25.000/bulan" : "Rp250.000/tahun"}
              — Pembayaran aman via Midtrans
            </p>

            {/* Payment Method Buttons */}
            <div className="space-y-2">
              <button
                onClick={handlePaymentSuccess}
                disabled={activating}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-4 text-left transition-all hover:border-coral hover:bg-coral-light/30 active:scale-[0.99] disabled:opacity-50 dark:border-stone-700 dark:hover:bg-coral-dark/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <span className="text-lg font-bold text-blue-600">VA</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Transfer Bank</p>
                  <p className="text-xs text-stone-400 dark:text-stone-400">BCA, Mandiri, BRI, BNI</p>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-500" />
              </button>

              <button
                onClick={handlePaymentSuccess}
                disabled={activating}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-4 text-left transition-all hover:border-coral hover:bg-coral-light/30 active:scale-[0.99] disabled:opacity-50 dark:border-stone-700 dark:hover:bg-coral-dark/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <span className="text-lg font-bold text-green-600">QR</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">QRIS</p>
                  <p className="text-xs text-stone-400 dark:text-stone-400">Scan via GoPay, OVO, Dana, dll</p>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-500" />
              </button>

              <button
                onClick={handlePaymentSuccess}
                disabled={activating}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-4 text-left transition-all hover:border-coral hover:bg-coral-light/30 active:scale-[0.99] disabled:opacity-50 dark:border-stone-700 dark:hover:bg-coral-dark/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <span className="text-lg font-bold text-red-600">CC</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Kartu Kredit</p>
                  <p className="text-xs text-stone-400 dark:text-stone-400">Visa, Mastercard</p>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-500" />
              </button>
            </div>

            {activating && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-stone-50 py-3 text-sm text-stone-500 dark:bg-stone-700 dark:text-stone-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses pembayaran...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promo Code */}
      <div className="mb-8 rounded-2xl border border-dashed border-stone-300 bg-white p-5 dark:border-stone-600 dark:bg-stone-800">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
          Punya kode promo?
        </h3>
        <div className="flex gap-2">
          <input
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handlePromoActivate()}
            placeholder="Masukkan kode"
            className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-stone-700 dark:bg-stone-900"
          />
          <button
            onClick={handlePromoActivate}
            disabled={!promoCode.trim() || activating}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
          >
            {activating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Aktivasi"
            )}
          </button>
        </div>
        {promoError && (
          <p className="mt-2 text-xs text-red-500">{promoError}</p>
        )}
        <p className="mt-2 text-xs text-stone-400 dark:text-stone-400">
          Coba kode: <span className="font-mono font-medium text-stone-500 dark:text-stone-300">RESEPIN PREMIUM</span>
        </p>
      </div>

      {/* Testimonial-like CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 p-6 text-center text-white dark:from-stone-700 dark:to-stone-800">
        <p className="mb-1 text-lg font-bold">Masak tiap hari tanpa ribet</p>
        <p className="mb-4 text-sm text-stone-400 dark:text-stone-400">
          Lebih dari 1.000 ibu rumah tangga sudah jadi Premium.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:underline"
        >
          Lihat dashboard
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
