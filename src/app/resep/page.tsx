"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChefHat, Clock, Plus, Search, SlidersHorizontal, Utensils } from "lucide-react";
import { KONTEKS_KATEGORI, getKonteksForKategori } from "@/lib/kategori";

export default function ResepPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const resepList = useQuery(api.resep.list, {
    userId: session?.user?.id || "",
  });
  const stokList = useQuery(api.stok.list, {
    userId: session?.user?.id || "",
  });

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState(searchParams.get("kategori") || "");
  const [showBisaDimasak, setShowBisaDimasak] = useState(false);

  const stokNamaSet = useMemo(
    () => new Set((stokList || []).map((s) => s.nama.toLowerCase())),
    [stokList],
  );

  const allCategories = useMemo(() => {
    if (!resepList) return [];
    const cats = new Set<string>();
    resepList.forEach((r) => r.kategori?.forEach((k) => cats.add(k)));
    return Array.from(cats).sort();
  }, [resepList]);

  const filtered = useMemo(() => {
    if (!resepList) return [];
    return resepList.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory) {
        const ctx = KONTEKS_KATEGORI.find((c) => c.label === filterCategory);
        const matchKonteks = ctx
          ? r.kategori?.some((k) => ctx.sub.includes(k.toLowerCase()))
          : false;
        const matchLabel = (r.kategori || []).includes(filterCategory);
        if (!matchKonteks && !matchLabel) return false;
      }
      if (showBisaDimasak) {
        const allInStock = r.bahan.every((b) =>
          stokNamaSet.has(b.nama.toLowerCase()),
        );
        if (!allInStock) return false;
      }
      return true;
    });
  }, [resepList, search, filterCategory, showBisaDimasak, stokNamaSet]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resep</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-400">
            {resepList?.length || 0} resep tersimpan
          </p>
        </div>

        <Link
          href="/resep/tambah"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-white shadow-lg shadow-coral/25 transition-all active:scale-90"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari resep..."
          className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-coral dark:border-stone-700 dark:bg-stone-800"
        />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowBisaDimasak(!showBisaDimasak)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            showBisaDimasak
              ? "bg-coral text-white"
              : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-coral dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
          }`}
        >
          <Utensils className="h-3.5 w-3.5" />
          Bisa Dimasak
        </button>

        <div className="h-4 w-px bg-stone-200 dark:bg-stone-700" />

        <button
          onClick={() => setFilterCategory("")}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            !filterCategory
              ? "bg-coral text-white shadow-sm"
              : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-coral dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
          }`}
        >
          Semua
        </button>

        {KONTEKS_KATEGORI.map((ctx) => (
          <button
            key={ctx.label}
            onClick={() => setFilterCategory(filterCategory === ctx.label ? "" : ctx.label)}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === ctx.label
                ? "bg-sage text-white"
                : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-sage dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
            }`}
          >
            <span>{ctx.icon}</span>
            {ctx.label}
          </button>
        ))}

        {(search || filterCategory || showBisaDimasak) && (
          <button
            onClick={() => { setSearch(""); setFilterCategory(""); setShowBisaDimasak(false); }}
            className="text-xs text-coral hover:underline"
          >
            Hapus filter
          </button>
        )}
      </div>

      {resepList === undefined || stokList === undefined ? (
        <div className="flex flex-col items-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-stone-100 dark:bg-stone-700">
            <ChefHat className="h-9 w-9 text-stone-300 dark:text-stone-500" />
          </div>
          <p className="mb-1 text-base font-semibold">
            {search || filterCategory || showBisaDimasak
              ? "Tidak ada hasil"
              : "Belum ada resep"}
          </p>
          <p className="mb-8 max-w-xs text-center text-sm text-stone-400 dark:text-stone-400">
            {search || filterCategory || showBisaDimasak
              ? "Coba ubah kata kunci atau filter."
              : "Tambahkan resep pertamamu, atau paste link YouTube untuk ekstrak otomatis."}
          </p>
          <Link
            href="/resep/tambah"
            className="rounded-2xl bg-coral px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition-all active:scale-95"
          >
            + Tambah Resep
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((resep) => (
            <Link key={resep._id} href={`/resep/${resep._id}`}>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-shadow hover:shadow-md active:scale-[0.98] dark:bg-stone-800 dark:ring-stone-700">
                <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900">
                  {resep.foto ? (
                    <img src={resep.foto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ChefHat className="h-9 w-9 text-stone-200 dark:text-stone-600" />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{resep.name}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-400 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resep.durasi || "?"}m
                    </span>
                    <span>{resep.bahan.length} bahan</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
