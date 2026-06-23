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
  Wallet,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
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

const PAYMENT_METHODS = [
  { value: "gopay", label: "GoPay" },
  { value: "ovo", label: "OVO" },
  { value: "dana", label: "Dana" },
  { value: "shopeepay", label: "ShopeePay" },
  { value: "mobile-banking", label: "Mobile Banking" },
  { value: "lainnya", label: "Lainnya" },
];

export default function PremiumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const premiumStatus = useQuery(api.users.getPremiumStatus, {
    googleId: session?.user?.id || "",
  });
  const activatePremium = useMutation(api.users.activatePremium);
  const createPayment = useMutation(api.payments.create);

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"qris" | "form" | "success">("qris");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [activating, setActivating] = useState(false);

  const [pengirim, setPengirim] = useState("");
  const [metode, setMetode] = useState("gopay");
  const [catatan, setCatatan] = useState("");

  const planAmount = selectedPlan === "monthly" ? 25000 : 250000;
  const planLabel = selectedPlan === "monthly" ? "Bulanan" : "Tahunan";

  function handleSelectPlan(plan: "monthly" | "yearly") {
    setSelectedPlan(plan);
    setPaymentStep("qris");
    setPengirim("");
    setMetode("gopay");
    setCatatan("");
    setShowPayment(true);
  }

  async function handleConfirmPayment() {
    if (!session?.user?.id || !selectedPlan) return;
    setActivating(true);
    try {
      await createPayment({
        googleId: session.user.id,
        plan: selectedPlan,
        amount: planAmount,
        metode,
        pengirim: pengirim.trim(),
        catatan: catatan.trim() || undefined,
      });
      setPaymentStep("success");
    } catch {
      setPromoError("Gagal mengirim konfirmasi, coba lagi");
    } finally {
      setActivating(false);
    }
  }

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

  if (premiumStatus?.isPremium) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Kamu Premium 🎉</h1>
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
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

      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
          Pilih Paket
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => handleSelectPlan("monthly")}
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
            onClick={() => handleSelectPlan("yearly")}
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
              <h3 className="text-sm font-bold">
                {paymentStep === "qris" && "Pembayaran via QRIS"}
                {paymentStep === "form" && "Konfirmasi Pembayaran"}
                {paymentStep === "success" && "Pembayaran Dikirim"}
              </h3>
              <button
                onClick={() => setShowPayment(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-700 dark:text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: Show QRIS */}
            {paymentStep === "qris" && (
              <>
                <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">
                  Paket {planLabel} — Rp{planAmount.toLocaleString("id-ID")}
                </p>

                <div className="mx-auto mb-4 flex w-56 justify-center rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-600 dark:bg-white">
                  <Image
                    src="/QRIS.jpeg"
                    alt="QRIS"
                    width={200}
                    height={200}
                    className="h-48 w-48 object-contain"
                  />
                </div>

                <p className="mb-1 text-center text-xs text-stone-400 dark:text-stone-400">
                  Scan QRIS di atas menggunakan
                </p>
                <p className="mb-5 text-center text-sm font-medium text-stone-700 dark:text-stone-200">
                  GoPay, OVO, Dana, ShopeePay, atau e-wallet lainnya
                </p>

                <button
                  onClick={() => setPaymentStep("form")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark active:scale-[0.99]"
                >
                  <Wallet className="h-4 w-4" />
                  Saya Sudah Bayar
                </button>
              </>
            )}

            {/* Step 2: Confirmation Form */}
            {paymentStep === "form" && (
              <>
                <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">
                  Isi data pembayaran kamu untuk verifikasi
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Nama Pengirim
                    </label>
                    <input
                      value={pengirim}
                      onChange={(e) => setPengirim(e.target.value)}
                      placeholder="Nama di e-wallet / rekening"
                      className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-stone-700 dark:bg-stone-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Metode Pembayaran
                    </label>
                    <select
                      value={metode}
                      onChange={(e) => setMetode(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-stone-700 dark:bg-stone-900"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Catatan <span className="text-stone-400">(opsional)</span>
                    </label>
                    <input
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Nomor referensi atau keterangan"
                      className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 dark:border-stone-700 dark:bg-stone-900"
                    />
                  </div>
                </div>

                {promoError && (
                  <p className="mt-3 text-xs text-red-500">{promoError}</p>
                )}

                <button
                  onClick={handleConfirmPayment}
                  disabled={!pengirim.trim() || activating}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-coral py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark active:scale-[0.99] disabled:opacity-50"
                >
                  {activating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Konfirmasi"
                  )}
                </button>
              </>
            )}

            {/* Step 3: Success */}
            {paymentStep === "success" && (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-light">
                  <CheckCircle2 className="h-8 w-8 text-sage-dark" />
                </div>
                <h4 className="mb-1 text-base font-bold">Konfirmasi Dikirim</h4>
                <p className="mb-6 text-sm text-stone-400 dark:text-stone-400">
                  Admin akan memeriksa pembayaran dan mengaktifkan Premium kamu. {'\n'}Biasanya dalam 1x24 jam.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-coral px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark"
                >
                  Kembali ke Dashboard
                  <ChevronRight className="h-4 w-4" />
                </Link>
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
