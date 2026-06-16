"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Search,
  PackagePlus,
  Beef,
  LeafyGreen,
  Sprout,
  Apple,
  Package,
  ChefHat,
  Hand,
  Check,
} from "lucide-react";
import Link from "next/link";

const KATEGORI_BAHAN: Record<string, { items: string[]; icon: any; color: string }> = {
  Protein: { items: ["ayam", "daging", "sapi", "kambing", "ikan", "udang", "cumi", "telur", "tahu", "tempe", "bakso", "sosis"], icon: Beef, color: "text-red-500 bg-red-50" },
  Sayuran: { items: ["bayam", "kangkung", "sawi", "kol", "wortel", "buncis", "tomat", "timun", "terong", "labu", "kentang", "kacang", "brokoli", "kembang", "daun", "selada"], icon: LeafyGreen, color: "text-green-600 bg-green-50" },
  Bumbu: { items: ["bawang", "garam", "gula", "kecap", "merica", "kunyit", "jahe", "lengkuas", "sereh", "daun", "cabe", "cabai", "lada", "ketumbar", "kemiri", "pala", "asam", "terasi", "saos", "saus", "minyak"], icon: Sprout, color: "text-amber-600 bg-amber-50" },
  Buah: { items: ["pisang", "apel", "jeruk", "mangga", "alpukat", "nanas", "semangka", "melon", "anggur", "pepaya"], icon: Apple, color: "text-orange-500 bg-orange-50" },
  Sembako: { items: ["beras", "tepung", "susu", "mentega", "margarin", "roti", "mie", "indomie"], icon: Package, color: "text-stone-600 bg-stone-100" },
};

function kategorikan(nama: string): { kat: string; icon: any; color: string } {
  const lower = nama.toLowerCase();
  for (const [kat, cfg] of Object.entries(KATEGORI_BAHAN)) {
    if (cfg.items.some((i) => lower.includes(i))) return { kat, icon: cfg.icon, color: cfg.color };
  }
  return { kat: "Lainnya", icon: Hand, color: "text-stone-400 bg-stone-50" };
}

export default function BelanjaPage() {
  const { data: session } = useSession();
  const resepList = useQuery(api.resep.list, { userId: session?.user?.id || "" });
  const stokList = useQuery(api.stok.list, { userId: session?.user?.id || "" });
  const addStok = useMutation(api.stok.create);
  const [selectedResep, setSelectedResep] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [searchResep, setSearchResep] = useState("");
  const [addingToStock, setAddingToStock] = useState(false);

  const stokNamaSet = useMemo(
    () => stokList ? new Set(stokList.map((s) => s.nama.toLowerCase())) : new Set(),
    [stokList],
  );

  const semuaKurang = useMemo(
    () => resepList && stokList
      ? resepList.filter((r) =>
          r.bahan.some((b) => !stokNamaSet.has(b.nama.toLowerCase())),
        )
      : [],
    [resepList, stokList, stokNamaSet],
  );

  const resepFiltered = searchResep.trim()
    ? semuaKurang.filter((r) => r.name.toLowerCase().includes(searchResep.toLowerCase()))
    : semuaKurang;

  const resepDipilih = useMemo(
    () => selectedResep.size > 0
      ? (resepList || []).filter((r) => selectedResep.has(r._id))
      : semuaKurang.slice(0, 5),
    [selectedResep, resepList, semuaKurang],
  );

  const allNeeded = useMemo(() => {
    if (!resepDipilih.length) return [];
    const map = new Map<string, { nama: string; jumlah: number; satuan: string; dari: string[] }>();
    for (const r of resepDipilih) {
      for (const b of r.bahan) {
        if (stokNamaSet.has(b.nama.toLowerCase())) continue;
        const key = b.nama.toLowerCase();
        if (map.has(key)) {
          const existing = map.get(key)!;
          if (b.satuan === existing.satuan) existing.jumlah += b.jumlah;
          if (!existing.dari.includes(r.name)) existing.dari.push(r.name);
        } else {
          map.set(key, { nama: b.nama, jumlah: b.jumlah, satuan: b.satuan, dari: [r.name] });
        }
      }
    }
    return Array.from(map.values());
  }, [resepDipilih, stokNamaSet]);

  const grouped = useMemo(() => {
    const g = new Map<string, { items: typeof allNeeded; icon: any; color: string }>();
    for (const item of allNeeded) {
      const { kat, icon, color } = kategorikan(item.nama);
      if (!g.has(kat)) g.set(kat, { items: [], icon, color });
      g.get(kat)!.items.push(item);
    }
    return g;
  }, [allNeeded]);

  const totalItems = allNeeded.length;
  const checkedCount = checkedItems.size;
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  if (!resepList || !stokList) {
    return (
      <div className="flex flex-col items-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  function toggleResep(id: string) {
    setSelectedResep((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllResep() {
    setSelectedResep(new Set(semuaKurang.map((r) => r._id)));
  }

  function deselectAllResep() {
    setSelectedResep(new Set());
  }

  function toggleItem(nama: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(nama)) next.delete(nama);
      else next.add(nama);
      return next;
    });
  }

  async function handleAddToStock() {
    if (!session?.user?.id || checkedItems.size === 0) return;
    setAddingToStock(true);
    for (const item of allNeeded) {
      if (checkedItems.has(item.nama)) {
        await addStok({
          userId: session.user.id,
          nama: item.nama,
          jumlah: item.jumlah,
          satuan: item.satuan || "buah",
        });
      }
    }
    setCheckedItems(new Set());
    setAddingToStock(false);
  }

  const listText = useMemo(() => {
    let text = "📋 Daftar Belanja ResepIn\n\n";
    if (selectedResep.size > 0) {
      text += "Resep dipilih:\n";
      resepDipilih.forEach((r) => { text += `  • ${r.name}\n`; });
      text += "\n";
    }
    for (const [kat, { items }] of grouped) {
      text += `${kat}:\n`;
      items.forEach((item) => {
        const checked = checkedItems.has(item.nama) ? "☑" : "□";
        text += `  ${checked} ${item.nama}`;
        if (item.jumlah > 0 && item.satuan) text += ` — ${item.jumlah} ${item.satuan}`;
        text += "\n";
      });
      text += "\n";
    }
    return text;
  }, [grouped, resepDipilih, selectedResep, checkedItems]);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Belanja</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            {selectedResep.size > 0
              ? `${totalItems} bahan dari ${selectedResep.size} resep`
              : "Bahan yang belum ada di stok"}
          </p>
        </div>
        <Link
          href="/stok"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-white shadow-lg shadow-coral/25 transition-all active:scale-90"
        >
          <PackagePlus className="h-6 w-6" />
        </Link>
      </div>

      {semuaKurang.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-sage-light">
            <CheckCircle2 className="h-9 w-9 text-sage-dark" />
          </div>
          <p className="mb-1 text-base font-semibold">Stok lengkap!</p>
          <p className="mb-6 text-sm text-stone-400">Semua bahan resep sudah tersedia di dapur.</p>
          <Link
            href="/resep"
            className="flex items-center gap-2 rounded-2xl bg-coral px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all active:scale-[0.98]"
          >
            <ChefHat className="h-4 w-4" />
            Cari Resep Baru
          </Link>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {totalItems > 0 && (
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {checkedCount === totalItems ? "Semua sudah dibeli! 🎉" : `${checkedCount} dari ${totalItems} bahan`}
                </span>
                <span className="text-stone-400">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progressPct === 100 ? "bg-sage" : "bg-coral"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Recipe selector */}
          <div className="mb-4 rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium"
            >
              <span>Pilih resep ({selectedResep.size > 0 ? selectedResep.size : semuaKurang.length} dipilih)</span>
              {expanded ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {expanded && (
              <div className="border-t border-stone-100 px-5 py-2">
                {/* Search */}
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <input
                    value={searchResep}
                    onChange={(e) => setSearchResep(e.target.value)}
                    placeholder="Cari resep..."
                    className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-xs outline-none transition-colors focus:border-coral"
                  />
                </div>

                {/* Select/Deselect all */}
                <div className="mb-2 flex gap-2 px-1">
                  <button onClick={selectAllResep} className="text-xs font-medium text-coral hover:text-coral-dark">
                    Pilih semua
                  </button>
                  <button onClick={deselectAllResep} className="text-xs text-stone-400 hover:text-stone-600">
                    Hapus semua
                  </button>
                </div>

                {resepFiltered.map((r) => (
                  <label
                    key={r._id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-stone-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedResep.has(r._id)}
                      onChange={() => toggleResep(r._id)}
                      className="h-4 w-4 rounded border-stone-300 accent-coral"
                    />
                    <span className="text-sm">{r.name}</span>
                    <span className="ml-auto text-xs text-stone-400">
                      {r.bahan.filter((b) => !stokNamaSet.has(b.nama.toLowerCase())).length} bahan
                    </span>
                  </label>
                ))}
                {resepFiltered.length === 0 && (
                  <p className="py-3 text-center text-xs text-stone-400">Resep tidak ditemukan</p>
                )}
              </div>
            )}
          </div>

          {/* Grouped shopping list */}
          {allNeeded.length > 0 && (
            <div className="mb-6 space-y-3">
              {Array.from(grouped.entries()).map(([kat, { items, icon: Icon, color }]) => (
                <div key={kat} className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-100">
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">{kat}</span>
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">{items.length}</span>
                  </div>
                  {items.map((item, i) => {
                    const checked = checkedItems.has(item.nama);
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-stone-50 ${
                          checked ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.nama)}
                          className="h-4 w-4 rounded border-stone-300 accent-coral"
                        />
                        <span className={`flex-1 text-sm ${checked ? "line-through text-stone-300" : ""}`}>
                          {item.nama}
                        </span>
                        {item.jumlah > 0 && item.satuan && (
                          <span className="text-xs text-stone-400">
                            {item.jumlah === Math.floor(item.jumlah) ? item.jumlah : item.jumlah} {item.satuan}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-300">{item.dari.join(", ")}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mb-10 flex flex-col gap-3">
            <button
              onClick={() => navigator.clipboard.writeText(listText)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 transition-all active:scale-[0.98]"
            >
              <ClipboardList className="h-5 w-5" />
              Salin Daftar Belanja
            </button>

            {checkedCount > 0 && (
              <button
                onClick={handleAddToStock}
                disabled={addingToStock}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sage py-3.5 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <PackagePlus className="h-5 w-5" />
                {addingToStock ? "Menambahkan..." : `Tambahkan ${checkedCount} bahan ke Stok`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
