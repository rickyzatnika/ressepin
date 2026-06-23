"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  ChefHat,
  Package,
  ShoppingCart,
  Plus,
  Sparkles,
  ArrowRight,
  Shuffle,
  BookOpen,
  Utensils,
  Coffee,
  CakeSlice,
  Globe,
  ClipboardList,
  Zap,
  Film,
  Crown,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";
import { KONTEKS_KATEGORI, getKonteksForKategori } from "@/lib/kategori";
import QuickStart from "./QuickStart";
import {
  requestPermission,
  sendNotification,
  getPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  registerServiceWorker,
} from "@/lib/notifications";

const KONTEKS_ICON: Record<string, any> = {
  "Masakan Tradisional": Globe,
  "Masakan Modern": ChefHat,
  "Dessert": CakeSlice,
  "Minuman": Coffee,
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const resepList = useQuery(api.resep.list, {
    userId: session?.user?.id || "",
  });
  const stokList = useQuery(api.stok.list, {
    userId: session?.user?.id || "",
  });
  const premiumStatus = useQuery(api.users.getPremiumStatus, {
    googleId: session?.user?.id || "",
  });
  const [showQuickStart, setShowQuickStart] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  const stokNamaSet = useMemo(
    () => new Set((stokList || []).map((s) => s.nama.toLowerCase())),
    [stokList],
  );

  const bisaDimasak = useMemo(
    () =>
      (resepList || []).filter((r) =>
        r.bahan.every((b) => stokNamaSet.has(b.nama.toLowerCase())),
      ),
    [resepList, stokNamaSet],
  );

  const resepByKonteks = useMemo(() => {
    if (!resepList) return new Map<string, typeof resepList>();
    const g = new Map<string, typeof resepList>();
    for (const r of resepList) {
      const konteks = getKonteksForKategori(r.kategori || []);
      if (!konteks) continue;
      if (!g.has(konteks)) g.set(konteks, []);
      g.get(konteks)!.push(r);
    }
    return g;
  }, [resepList]);

  // Cooking streak
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toDateString();
    const last = localStorage.getItem("resepin_last_visit");
    const count = parseInt(localStorage.getItem("resepin_streak") || "0");
    if (last === today) {
      setStreak(count);
    } else {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = last === yesterday ? count + 1 : 1;
      localStorage.setItem("resepin_last_visit", today);
      localStorage.setItem("resepin_streak", newStreak.toString());
      setStreak(newStreak);
    }
  }, []);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");
  const subscribePush = useMutation(api.pushSubscriptions.subscribe);
  const unsubscribePush = useMutation(api.pushSubscriptions.unsubscribe);

  useEffect(() => {
    setNotifPermission(getPermission());
    registerServiceWorker(); // warm up SW early
  }, []);

  useEffect(() => {
    getPushSubscription().then((sub) => {
      setPushSubscribed(!!sub);
      if (sub) setNotifPermission("granted");
    });
  }, []);

  // Auto-notify: stok hampir habis + daily reminder
  useEffect(() => {
    if (!stokList || !resepList || stokList.length === 0) return;
    if (getPermission() !== "granted") return;

    const today = new Date().toDateString();
    const lastNotify = localStorage.getItem("resepin_last_notify");

    if (lastNotify !== today) {
      // Check low stock
      const lowStock = stokList.filter((s) => s.jumlah <= 1);
      if (lowStock.length > 0) {
        const names = lowStock.slice(0, 3).map((s) => s.nama).join(", ");
        const more = lowStock.length > 3 ? ` +${lowStock.length - 3} lagi` : "";
        sendNotification("Stok hampir habis!", `${names}${more} — waktunya belanja!`);
      } else if (streak > 0 && resepList.length > 0) {
        // Daily cooking reminder
        const random = resepList[Math.floor(Math.random() * resepList.length)];
        sendNotification("Waktunya masak! 🔥", `Kamu punya streak ${streak} hari. Coba masak ${random.name} hari ini.`);
      }
      localStorage.setItem("resepin_last_notify", today);
    }
  }, [stokList, resepList, streak]);

  async function handleNotifToggle() {
    if (notifLoading) return;
    setNotifError("");

    // Unsubscribe
    if (pushSubscribed) {
      setNotifLoading(true);
      try {
        await unsubscribeFromPush(session?.user?.id || "", unsubscribePush);
        setPushSubscribed(false);
        setNotifPermission(getPermission());
      } catch (e) {
        setNotifError("Gagal berhenti langganan");
      } finally {
        setNotifLoading(false);
      }
      return;
    }

    // Permission denied — guide user
    if (notifPermission === "denied") {
      setNotifError("Notifikasi diblokir browser. Izinkan lewat Pengaturan > Privasi & Keamanan > Notifikasi.");
      return;
    }

    // Permission default — request first
    if (notifPermission === "default") {
      const ok = await requestPermission();
      setNotifPermission(ok ? "granted" : "denied");
      if (!ok) return;
    }

    // Permission granted — subscribe push
    setNotifLoading(true);
    try {
      const subscribed = await subscribeToPush(
        session?.user?.id || "",
        subscribePush,
      );
      setPushSubscribed(subscribed);

      if (subscribed && stokList) {
        const lowStock = stokList.filter((s) => s.jumlah <= 1);
        if (lowStock.length > 0) {
          sendNotification("Notifikasi aktif! 🔔", `${lowStock.length} bahan hampir habis.`);
        }
      }
    } catch {
      setNotifError("Gagal berlangganan notifikasi, coba lagi.");
    } finally {
      setNotifLoading(false);
    }
  }

  // Quick stock add
  const addStok = useMutation(api.stok.create);
  const [quickStokName, setQuickStokName] = useState("");
  const [quickStokSaving, setQuickStokSaving] = useState(false);
  async function handleQuickStok() {
    if (!quickStokName.trim() || !session?.user?.id) return;
    setQuickStokSaving(true);
    try {
      await addStok({
        userId: session.user.id,
        nama: quickStokName.trim(),
        jumlah: 1,
        satuan: "buah",
      });
      setQuickStokName("");
    } catch {}
    setQuickStokSaving(false);
  }

  // Random daily suggestion
  const [dailyIdx, setDailyIdx] = useState(0);
  useEffect(() => {
    if (resepList && resepList.length > 0) {
      const today = new Date().toDateString();
      const hash = today.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      setDailyIdx(hash % resepList.length);
    }
  }, [resepList]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const isEmpty = !resepList || resepList.length === 0;
  const kurangStokCount = resepList
    ? resepList.filter((r) =>
        r.bahan.some((b) => !stokNamaSet.has(b.nama.toLowerCase())),
      ).length
    : 0;

  // Find nearest recipe where only 1-2 ingredients are missing
  const hampirBisa = useMemo(() => {
    if (!resepList || !stokList) return null;
    let best: { recipe: typeof resepList[number]; missing: number } | null = null;
    for (const r of resepList) {
      if (bisaDimasak.some((b) => b._id === r._id)) continue;
      const missing = r.bahan.filter((b) => !stokNamaSet.has(b.nama.toLowerCase())).length;
      if (!best || missing < best.missing) best = { recipe: r, missing };
    }
    return best;
  }, [resepList, stokList, stokNamaSet, bisaDimasak]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-6">
      {/* Greeting + Streak + Premium */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Hai, {session.user?.name?.split(" ")[0] || "Koki"}!
            </h1>
            {premiumStatus?.isPremium && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                <Crown className="h-3 w-3" />
                PREMIUM
              </span>
            )}
          </div>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            {isEmpty
              ? "Yuk mulai petualangan masakmu!"
              : `${resepList.length} resep · ${stokList?.length || 0} bahan`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={handleNotifToggle}
              disabled={notifLoading}
              className={`flex shrink-0 items-center justify-center rounded-xl p-2 transition-colors ${
                notifLoading
                  ? "bg-stone-100 text-stone-300 dark:bg-stone-800 dark:text-stone-600"
                  : notifPermission === "granted" || pushSubscribed
                    ? "bg-sage-light text-sage-dark hover:bg-sage-light/80"
                    : notifPermission === "denied"
                      ? "bg-red-50 text-red-400 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-stone-100 text-stone-400 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-500"
              }`}
              title={
                notifLoading ? "Memproses..." :
                pushSubscribed ? "Notifikasi aktif" :
                notifPermission === "denied" ? "Notifikasi diblokir" :
                "Aktifkan notifikasi"
              }
            >
              {notifLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushSubscribed || notifPermission === "granted" ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
            {notifError && (
              <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl bg-white p-3 text-xs text-red-500 shadow-lg ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700">
                {notifError}
                <button
                  onClick={() => setNotifError("")}
                  className="ml-1 font-bold text-stone-400 hover:text-stone-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {!premiumStatus?.isPremium && (
            <Link
              href="/premium"
              className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 transition-colors hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50"
            >
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Premium</span>
            </Link>
          )}
          {streak > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-sm font-bold text-amber-700">{streak}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">Hari</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEmpty && !showQuickStart ? (
        <div className="flex flex-col items-center py-8">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-coral to-orange-500 shadow-lg shadow-coral/30">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <p className="mb-2 text-center text-lg font-semibold">
            Mulai cepat, bro!
          </p>
          <p className="mb-8 max-w-xs text-center text-sm text-stone-400 dark:text-stone-400">
            Kasih tahu bahan yang ada di dapurmu, AI langsung bikin resepnya.
          </p>

          <div className="flex w-full max-w-sm flex-col gap-3">
            <button
              onClick={() => setShowQuickStart(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition-all active:scale-[0.98]"
            >
              <Zap className="h-5 w-5" />
              Mulai Cepat (Rekomendasi)
            </button>
            <Link
              href="/resep/tambah"
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-3.5 text-sm font-medium text-stone-600 transition-all active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <Film className="h-5 w-5" />
              Ekstrak dari YouTube
            </Link>
            <Link
              href="/stok"
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-3.5 text-sm font-medium text-stone-600 transition-all active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <Package className="h-5 w-5" />
              Catat Stok Dapur
            </Link>
          </div>
        </div>
      ) : isEmpty && showQuickStart ? (
        <QuickStart
          userId={session?.user?.id || ""}
          onDone={() => setShowQuickStart(false)}
        />
      ) : resepList && stokList ? (
        <>
          {/* ── HERO: Bisa Masak Hari Ini ── */}
          {bisaDimasak.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Utensils className="h-4 w-4 text-sage" />
                  Bisa masak hari ini
                </h2>
                <Link
                  href="/belanja"
                  className="text-xs font-medium text-coral hover:underline"
                >
                  {kurangStokCount > 0 ? `${kurangStokCount} perlu belanja` : ""}
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {bisaDimasak.slice(0, 5).map((r) => (
                  <Link
                    key={r._id}
                    href={`/resep/${r._id}`}
                    className="w-48 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:bg-stone-800 dark:ring-stone-700"
                  >
                    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900">
                      {r.foto ? (
                        <img src={r.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ChefHat className="h-7 w-7 text-stone-200 dark:text-stone-600" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.name}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-400 dark:text-stone-400">
                        <span>⏱ {r.durasi || "?"}m</span>
                        <span>{r.bahan.length} bahan</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── HERO: Hampir Bisa (kalo ga ada yg bisa dimasak) ── */}
          {bisaDimasak.length === 0 && hampirBisa && (
            <div className="mb-6 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
              <div className="mb-1 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-semibold text-amber-800">
                  Kurang {hampirBisa.missing} bahan buat masak {hampirBisa.recipe.name}
                </p>
              </div>
              <p className="mb-4 text-xs text-amber-600">
                Beli bahannya di sini:
              </p>
              <div className="flex gap-2">
                <a
                  href={`https://www.tokopedia.com/find?q=${encodeURIComponent(hampirBisa.recipe.bahan.filter((b) => !stokNamaSet.has(b.nama.toLowerCase())).map((b) => b.nama).join(" "))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-center text-xs font-semibold text-white"
                >
                  Tokopedia
                </a>
                <a
                  href={`https://shopee.co.id/search?keyword=${encodeURIComponent(hampirBisa.recipe.bahan.filter((b) => !stokNamaSet.has(b.nama.toLowerCase())).map((b) => b.nama).join(" "))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-orange-500 py-2.5 text-center text-xs font-semibold text-white"
                >
                  Shopee
                </a>
              </div>
            </div>
          )}

          {/* ── Quick Stock Add ── */}
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-400">
              Tambah Bahan ke Stok
            </p>
            <div className="flex gap-2">
              <input
                value={quickStokName}
                onChange={(e) => setQuickStokName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickStok()}
                placeholder="Nama bahan..."
                className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/10 dark:border-stone-700 dark:bg-stone-900"
              />
              <button
                onClick={handleQuickStok}
                disabled={!quickStokName.trim() || quickStokSaving}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-coral-dark active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Tambah
              </button>
            </div>
          </div>

          {/* ── Saran Hari Ini ── */}
          {resepList.length > 0 && (
            <Link
              href={`/resep/${resepList[dailyIdx]._id}`}
              className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-coral to-orange-500 p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Saran Hari Ini
                </p>
                <p className="text-sm font-semibold text-white">
                  {resepList[dailyIdx].name}
                </p>
                <p className="text-xs text-white/70">
                  ⏱ {resepList[dailyIdx].durasi || "?"}m
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/70" />
            </Link>
          )}

          {/* ── Stats ── */}
          <div className="mb-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
              <p className="text-lg font-bold text-coral">{resepList.length}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-400">Resep</p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
              <p className="text-lg font-bold text-sage">{stokList?.length || 0}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-400">Stok</p>
            </div>
            <Link
              href="/belanja"
              className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-stone-100 transition-colors hover:ring-coral dark:bg-stone-800 dark:ring-stone-700"
            >
              <p className="text-lg font-bold text-coral">{kurangStokCount}</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-400">Belanja</p>
            </Link>
          </div>

          {/* ── Quick actions ── */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/resep/tambah"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tambah Resep
            </Link>
            <Link
              href="/meal-planner"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-coral active:scale-95 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
            >
              <ClipboardList className="h-4 w-4" />
              Meal Planner
            </Link>
            <Link
              href="/stok"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-sage active:scale-95 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
            >
              <Package className="h-4 w-4" />
              Stok
            </Link>
          </div>

          {/* ── Resep by Kategori ── */}
          {resepByKonteks.size > 0 && (
            <div className="mb-6 space-y-5">
              {KONTEKS_KATEGORI.map((ctx) => {
                const items = resepByKonteks.get(ctx.label) || [];
                if (items.length === 0) return null;
                const Icon = KONTEKS_ICON[ctx.label] || ChefHat;
                return (
                  <section key={ctx.label}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4" />
                        {ctx.icon} {ctx.label}
                      </h2>
                      <Link
                        href={`/resep?kategori=${ctx.label}`}
                        className="text-xs font-medium text-coral hover:underline"
                      >
                        Lihat semua
                      </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {items.slice(0, 5).map((r) => (
                        <Link
                          key={r._id}
                          href={`/resep/${r._id}`}
                          className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md dark:bg-stone-800 dark:ring-stone-700"
                        >
                          <div className="flex h-24 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900">
                            {r.foto ? (
                              <img src={r.foto} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ChefHat className="h-7 w-7 text-stone-200 dark:text-stone-600" />
                            )}
                          </div>
                          <div className="p-3">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                              ⏱ {r.durasi || "?"}m · {r.bahan.length} bahan
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* ── Recent Recipes ── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Resep Terbaru</h2>
              <Link href="/resep" className="text-xs font-medium text-coral hover:underline">
                Lihat semua
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {resepList.slice(0, 4).map((r) => (
                <Link key={r._id} href={`/resep/${r._id}`}>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md active:scale-[0.98] dark:bg-stone-800 dark:ring-stone-700">
                    <div className="flex aspect-4/3 items-center justify-center bg-linear-to-br from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900">
                      {r.foto ? (
                        <img src={r.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ChefHat className="h-8 w-8 text-stone-200 dark:text-stone-600" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-400 dark:text-stone-400">
                        <span>⏱ {r.durasi || "?"}m</span>
                        <span>{r.bahan.length} bahan</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
