"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  Pencil,
} from "lucide-react";

const KATEGORI_STOK: Record<string, string[]> = {
  Protein: ["ayam", "daging", "sapi", "kambing", "ikan", "udang", "cumi", "telur", "tahu", "tempe", "bakso", "sosis"],
  Sayuran: ["bayam", "kangkung", "sawi", "kol", "wortel", "buncis", "tomat", "timun", "terong", "labu", "kentang", "kacang", "brokoli", "kembang", "daun", "selada"],
  Bumbu: ["bawang", "garam", "gula", "kecap", "merica", "kunyit", "jahe", "lengkuas", "sereh", "daun", "cabe", "cabai", "lada", "ketumbar", "kemiri", "pala", "asam", "terasi", "saos", "saus", "minyak"],
  Buah: ["pisang", "apel", "jeruk", "mangga", "alpukat", "nanas", "semangka", "melon", "anggur", "pepaya"],
  Sembako: ["beras", "tepung", "susu", "mentega", "margarin", "roti", "mie", "indomie"],
};

function kategorikan(nama: string): string {
  const lower = nama.toLowerCase();
  for (const [kat, items] of Object.entries(KATEGORI_STOK)) {
    if (items.some((i) => lower.includes(i))) return kat;
  }
  return "Lainnya";
}

function isLowStock(jumlah: number, satuan: string): boolean {
  if (satuan === "buah" || satuan === "butir" || satuan === "siung") return jumlah <= 2;
  if (satuan === "gr" || satuan === "gram") return jumlah <= 50;
  if (satuan === "kg") return jumlah <= 0.25;
  if (satuan === "ml" || satuan === "liter") return jumlah <= 100;
  if (satuan === "sdm" || satuan === "sdt") return jumlah <= 1;
  return jumlah <= 1;
}

export default function StokPage() {
  const { data: session } = useSession();
  const stokList = useQuery(api.stok.list, { userId: session?.user?.id || "" });
  const addStok = useMutation(api.stok.create);
  const updateStok = useMutation(api.stok.update);
  const removeStok = useMutation(api.stok.remove);
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("");
  const [search, setSearch] = useState("");
  const [expandKat, setExpandKat] = useState<Set<string>>(new Set(["Protein", "Sayuran", "Bumbu", "Buah", "Sembako", "Lainnya"]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJumlah, setEditJumlah] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id || !nama.trim()) return;
    await addStok({
      userId: session.user.id,
      nama: nama.trim(),
      jumlah: parseFloat(jumlah) || 0,
      satuan: satuan.trim() || "buah",
    });
    setNama("");
    setJumlah("");
    setSatuan("");
  }

  const grouped = useMemo(() => {
    const g = new Map<string, NonNullable<typeof stokList>>();
    if (!stokList) return g;
    let filtered = stokList;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = stokList.filter((s) => s.nama.toLowerCase().includes(q));
    }
    for (const item of filtered) {
      const kat = kategorikan(item.nama);
      if (!g.has(kat)) g.set(kat, []);
      g.get(kat)!.push(item);
    }
    return g;
  }, [stokList, search]);

  async function handleEditSave(id: string) {
    const val = parseFloat(editJumlah);
    if (!isNaN(val) && val >= 0) {
      await updateStok({ id: id as any, jumlah: val });
    }
    setEditingId(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stok Dapur</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-400">
            {stokList?.length || 0} bahan tersedia
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-90 ${
            showForm ? "bg-stone-300 dark:bg-stone-600 shadow-none" : "bg-sage shadow-sage/25"
          }`}
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari bahan di dapur..."
          className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-coral dark:border-stone-700 dark:bg-stone-800"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
          <div className="mb-3 flex gap-2">
            <input
              placeholder="Nama bahan"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-coral dark:border-stone-700 dark:bg-stone-900"
              autoFocus
            />
            <input
              type="number"
              placeholder="0"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="w-16 rounded-xl border border-stone-200 px-2 py-2.5 text-center text-sm outline-none transition-colors focus:border-coral dark:border-stone-700 dark:bg-stone-900"
            />
            <input
              placeholder="gr"
              value={satuan}
              onChange={(e) => setSatuan(e.target.value)}
              className="w-16 rounded-xl border border-stone-200 px-2 py-2.5 text-center text-sm outline-none transition-colors focus:border-coral dark:border-stone-700 dark:bg-stone-900"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-sage py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            Simpan
          </button>
        </form>
      )}

      {stokList === undefined ? (
        <div className="flex flex-col items-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      ) : stokList.length === 0 ? (
        <div className="flex flex-col items-center py-24">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-stone-100 dark:bg-stone-700">
            <Package className="h-9 w-9 text-stone-300 dark:text-stone-500" />
          </div>
          <p className="mb-1 text-base font-semibold">Dapur kosong</p>
          <p className="mb-6 text-sm text-stone-400 dark:text-stone-400">Tambahkan bahan yang kamu punya.</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-2xl bg-sage px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sage/25 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tambah Bahan
          </button>
        </div>
      ) : (
        <div className="mb-10 space-y-3">
          {Array.from(grouped.entries()).map(([kat, items]) => (
            <div key={kat} className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700">
              <button
                onClick={() => {
                  const next = new Set(expandKat);
                  if (next.has(kat)) next.delete(kat);
                  else next.add(kat);
                  setExpandKat(next);
                }}
                className="flex w-full items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">{kat}</span>
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500 dark:bg-stone-700 dark:text-stone-300">{items.length}</span>
                </div>
                {expandKat.has(kat) ? (
                  <ChevronUp className="h-4 w-4 text-stone-400 dark:text-stone-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-stone-400 dark:text-stone-400" />
                )}
              </button>
              {expandKat.has(kat) && (
                <div className="border-t border-stone-100 px-5 py-2 dark:border-stone-700">
                  {items.map((item) => {
                    const low = isLowStock(item.jumlah, item.satuan);
                    const isEditing = editingId === item._id;
                    return (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-xl px-1 py-2.5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                      >
                        <div className="flex items-center gap-3">
                          {low && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <div className={low ? "" : "ml-7"}>
                            <p className="text-sm font-medium">{item.nama}</p>
                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editJumlah}
                                    onChange={(e) => setEditJumlah(e.target.value)}
                                    className="w-16 rounded-lg border border-coral px-2 py-0.5 text-xs outline-none"
                                    autoFocus
                                    onBlur={() => handleEditSave(item._id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleEditSave(item._id);
                                      if (e.key === "Escape") setEditingId(null);
                                    }}
                                  />
                                  <span className="text-xs text-stone-400 dark:text-stone-400">{item.satuan}</span>
                                </div>
                              ) : (
                                <>
                                  <span className={`text-xs ${low ? "font-semibold text-amber-600" : "text-stone-400 dark:text-stone-400"}`}>
                                    {item.jumlah === Math.floor(item.jumlah) ? item.jumlah : item.jumlah} {item.satuan}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingId(item._id);
                                      setEditJumlah(item.jumlah.toString());
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded text-stone-300 hover:bg-stone-100 hover:text-stone-500 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStok({ id: item._id })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-red-50 hover:text-red-400 dark:text-stone-500 dark:hover:bg-red-900/30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
