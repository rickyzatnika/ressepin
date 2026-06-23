"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  ShoppingCart,
  Calendar,
  Users,
  Wallet,
  ChefHat,
  Sun,
  Sunrise,
  Moon,
  ArrowLeft,
  Trash2,
  ClipboardList,
  Crown,
} from "lucide-react";

interface MenuItem {
  day: number;
  sarapan?: string;
  makanSiang?: string;
  makanMalam?: string;
}

interface ShoppingItem {
  nama: string;
  jumlah: number;
  satuan: string;
  kategori: string;
}

export default function MealPlannerPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [budget, setBudget] = useState("500000");
  const [orang, setOrang] = useState("2");
  const [preferensi, setPreferensi] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const userId = session?.user?.id || "";
  const savedPlans = useQuery(api.mealPlans.list, { userId });
  const createPlan = useMutation(api.mealPlans.create);
  const deletePlan = useMutation(api.mealPlans.remove);

  const premiumStatus = useQuery(api.users.getPremiumStatus, { googleId: userId });
  const incrementFreeUsage = useMutation(api.users.incrementFreeMealPlanUsage);

  const canGenerate = premiumStatus?.isPremium || (premiumStatus?.freeMealPlansUsed ?? 0) < 1;

  async function handleGenerate() {
    if (!budget || !orang) return;
    if (!canGenerate) {
      setError("Kamu sudah menggunakan 1× Meal Plan gratis. Upgrade ke Premium untuk akses tak terbatas!");
      return;
    }
    setLoading(true);
    setError("");
    setMenu([]);
    setShoppingList([]);
    setSaved(false);

    try {
      const res = await fetch("/api/ai/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: parseInt(budget),
          orang: parseInt(orang),
          preferensi,
          days,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal generate");

      setMenu(data.menu || []);
      setShoppingList(data.shoppingList || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userId || menu.length === 0) return;
    setSaving(true);
    try {
      await createPlan({
        userId,
        title: `Meal Plan - Rp ${parseInt(budget).toLocaleString("id-ID")}`,
        budget: parseInt(budget),
        orang: parseInt(orang),
        preferensi,
        days,
        menu,
        shoppingList,
      });
      if (!premiumStatus?.isPremium) {
        await incrementFreeUsage({ googleId: userId });
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleLoadPlan(plan: NonNullable<typeof savedPlans>[number]) {
    if (!plan) return;
    setBudget(plan.budget.toString());
    setOrang(plan.orang.toString());
    setPreferensi(plan.preferensi);
    setDays(plan.days);
    setMenu(plan.menu);
    setShoppingList(plan.shoppingList);
    setSaved(true);
  }

  function getKategoriIcon(kategori: string) {
    switch (kategori) {
      case "Protein": return "🥩";
      case "Sayuran": return "🥬";
      case "Bumbu": return "🧄";
      case "Buah": return "🍎";
      case "Sembako": return "📦";
      default: return "📋";
    }
  }

  const IKON_MAKAN = [Sunrise, Sun, Moon];
  const LABEL_MAKAN = ["Sarapan", "Makan Siang", "Makan Malam"];
  const FIELD_MAKAN: ("sarapan" | "makanSiang" | "makanMalam")[] = [
    "sarapan",
    "makanSiang",
    "makanMalam",
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Meal Planner</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-400">
            Rencanakan menu mingguan dengan AI
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-light">
          <ClipboardList className="h-5 w-5 text-coral" />
        </div>
      </div>

      {/* Premium upsell */}
      {!canGenerate && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-bold text-amber-800">Gratis 1× sudah dipakai</p>
          </div>
          <p className="mb-4 text-xs text-amber-600">
            Upgrade ke Premium untuk membuat Meal Plan tak terbatas. Dapatkan juga AI Chef + pencarian web untuk resep lebih akurat!
          </p>
          <Link
            href="/premium"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade Premium
          </Link>
        </div>
      )}

      {/* Form */}
      <div className={`mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700 ${!canGenerate ? "opacity-50 pointer-events-none select-none" : ""}`}>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
              <Wallet className="h-3.5 w-3.5" />
              Budget / Minggu
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-400">
                Rp
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-xl border border-stone-200 py-2.5 pl-8 pr-3 text-sm outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/10 dark:border-stone-700 dark:bg-stone-900"
                placeholder="500000"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
              <Users className="h-3.5 w-3.5" />
              Jumlah Orang
            </label>
            <input
              type="number"
              value={orang}
              onChange={(e) => setOrang(e.target.value)}
              min={1}
              max={20}
              className="w-full rounded-xl border border-stone-200 py-2.5 px-3 text-sm outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/10 dark:border-stone-700 dark:bg-stone-900"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
            <ChefHat className="h-3.5 w-3.5" />
            Preferensi / Pantangan
          </label>
          <input
            type="text"
            value={preferensi}
            onChange={(e) => setPreferensi(e.target.value)}
            className="w-full rounded-xl border border-stone-200 py-2.5 px-3 text-sm outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/10 dark:border-stone-700 dark:bg-stone-900"
            placeholder="Contoh: tidak suka pedas, tinggi protein, budget hemat"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
            <Calendar className="h-3.5 w-3.5" />
            Durasi
          </label>
          <div className="flex gap-2">
            {[3, 5, 7].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  days === n
                    ? "bg-coral text-white shadow-sm"
                    : "border border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
                }`}
              >
                {n} hari
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memasak rencana...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Meal Plan
            </>
          )}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Results */}
      {menu.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Menu {days} Hari
            </h2>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                saved
                  ? "bg-sage-light text-sage-dark"
                  : "bg-coral-light text-coral hover:bg-coral hover:text-white"
              }`}
            >
              {saving ? "Menyimpan..." : saved ? "Tersimpan ✓" : "Simpan"}
            </button>
          </div>

          {menu.map((item) => (
            <div
              key={item.day}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-light text-xs font-bold text-coral">
                  {item.day}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">
                  Hari {item.day}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {FIELD_MAKAN.map((field, i) => {
                  const val = item[field];
                  if (!val) return null;
                  const Icon = IKON_MAKAN[i];
                  return (
                    <div
                      key={field}
                      className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3.5 py-2.5 dark:bg-stone-700"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-400">
                          {LABEL_MAKAN[i]}
                        </p>
                        <p className="truncate text-sm font-medium text-stone-700 dark:text-stone-200">
                          {val}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Shopping List */}
          {shoppingList.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
              <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
                <ShoppingCart className="h-3.5 w-3.5" />
                Daftar Belanja
              </h3>
              <p className="mb-4 text-[10px] text-stone-300 dark:text-stone-500">
                {shoppingList.length} bahan
              </p>
              <div className="space-y-1.5">
                {shoppingList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">
                        {getKategoriIcon(item.kategori)}
                      </span>
                      <span className="font-medium text-stone-700 dark:text-stone-200">
                        {item.nama}
                      </span>
                      <span className="text-[10px] uppercase text-stone-300 dark:text-stone-500">
                        {item.kategori}
                      </span>
                    </div>
                    <span className="text-sm text-stone-400 dark:text-stone-400">
                      {item.jumlah} {item.satuan}
                    </span>
                  </div>
                ))}
              </div>

              {/* Affiliate links */}
              <div className="mt-4 flex gap-2">
                <a
                  href={`https://www.tokopedia.com/find?q=${encodeURIComponent(shoppingList.map((i) => i.nama).join(" "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.98]"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Tokopedia
                </a>
                <a
                  href={`https://shopee.co.id/search?keyword=${encodeURIComponent(shoppingList.map((i) => i.nama).join(" "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98]"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Shopee
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Plans History */}
      {savedPlans && savedPlans.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
            Riwayat Meal Plan
          </h2>
          <div className="space-y-2">
            {savedPlans.map((plan) => (
              <div
                key={plan._id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700"
              >
                <button
                  onClick={() => handleLoadPlan(plan)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-light">
                    <ClipboardList className="h-4 w-4 text-sage-dark" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                      {plan.title}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-400">
                      {plan.days} hari · {plan.orang} orang ·{" "}
                      Rp {plan.budget.toLocaleString("id-ID")}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deletePlan({ id: plan._id })}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-300 hover:bg-red-50 hover:text-red-400 dark:text-stone-500 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
