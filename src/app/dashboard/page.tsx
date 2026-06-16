"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
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
} from "lucide-react";
import { KONTEKS_KATEGORI, getKonteksForKategori } from "@/lib/kategori";

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

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const isEmpty = !resepList || resepList.length === 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-6">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Hai, {session.user?.name?.split(" ")[0] || "Koki"}! 👋
        </h1>
        <p className="mt-1 text-stone-500">
          {isEmpty
            ? "Yuk mulai petualangan masakmu!"
            : `Kamu punya ${resepList.length} resep dan ${stokList?.length || 0} bahan di dapur.`}
        </p>
      </div>

      {isEmpty ? (
        /* ── Empty state: new user onboarding ── */
        <div className="flex flex-col items-center py-8">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-coral to-orange-500 shadow-lg shadow-coral/30">
            <ChefHat className="h-12 w-12 text-white" />
          </div>
          <p className="mb-2 text-center text-lg font-semibold">
            Mulai petualangan masakmu!
          </p>
          <p className="mb-8 max-w-xs text-center text-sm text-stone-400">
            Tambah resep pertamamu, ekstrak dari YouTube, atau import dari
            website resep manapun.
          </p>

          <div className="flex w-full max-w-sm flex-col gap-3">
            <Link
              href="/resep/tambah"
              className="flex items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition-all active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Tambah Resep Pertama
            </Link>
            <Link
              href="/stok"
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-3.5 text-sm font-medium text-stone-600 transition-all active:scale-[0.98]"
            >
              <Package className="h-5 w-5" />
              Catat Stok Dapur
            </Link>
          </div>

          <div className="mt-10 grid w-full max-w-sm grid-cols-3 gap-3 text-center text-xs text-stone-400">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-coral" />
              AI dari YouTube
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <Package className="mx-auto mb-2 h-6 w-6 text-sage" />
              Atur Stok
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <ShoppingCart className="mx-auto mb-2 h-6 w-6 text-coral" />
              Belanja Otomatis
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-stone-100">
              <p className="text-2xl font-bold text-coral">
                {resepList.length}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">Resep</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-stone-100">
              <p className="text-2xl font-bold text-sage">
                {stokList?.length || 0}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">Stok</p>
            </div>
            <Link
              href="/belanja"
              className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-stone-100 transition-colors hover:ring-coral"
            >
              <p className="text-2xl font-bold text-coral">
                {
                  resepList.filter((r) =>
                    r.bahan.some((b) => !stokNamaSet.has(b.nama.toLowerCase())),
                  ).length
                }
              </p>
              <p className="mt-0.5 text-xs text-stone-400">Belanja</p>
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
              href="/resep"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-coral active:scale-95"
            >
              <BookOpen className="h-4 w-4" />
              Semua Resep
            </Link>
            <Link
              href="/stok"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 transition-all hover:ring-sage active:scale-95"
            >
              <Package className="h-4 w-4" />
              Stok
            </Link>
          </div>

          {/* ── Bisa Dimasak Hari Ini ── */}
          {bisaDimasak.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Utensils className="h-4 w-4 text-sage" />
                  Bisa masak hari ini
                </h2>
                <Link
                  href="/resep"
                  className="text-xs font-medium text-coral hover:underline"
                >
                  Lihat semua
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {bisaDimasak.slice(0, 5).map((r) => (
                  <Link
                    key={r._id}
                    href={`/resep/${r._id}`}
                    className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
                      {r.foto ? (
                        <img
                          src={r.foto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ChefHat className="h-7 w-7 text-stone-200" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        ⏱ {r.durasi || "?"}m
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

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
                          className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md"
                        >
                          <div className="flex h-24 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
                            {r.foto ? (
                              <img
                                src={r.foto}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ChefHat className="h-7 w-7 text-stone-200" />
                            )}
                          </div>
                          <div className="p-3">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            <p className="mt-1 text-xs text-stone-400">
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
              <Link
                href="/resep"
                className="text-xs font-medium text-coral hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {resepList.slice(0, 4).map((r) => (
                <Link key={r._id} href={`/resep/${r._id}`}>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md active:scale-[0.98]">
                    <div className="flex aspect-4/3 items-center justify-center bg-linear-to-br from-stone-100 to-stone-50">
                      {r.foto ? (
                        <img
                          src={r.foto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ChefHat className="h-8 w-8 text-stone-200" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-400">
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
      )}
    </div>
  );
}
