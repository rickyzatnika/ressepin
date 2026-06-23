"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Sparkles,
  Loader2,
  Plus,
  Check,
  ArrowRight,
  X,
  Zap,
  Search,
} from "lucide-react";

const QUICK_BAHAN = [
  "Telur",
  "Bawang Merah",
  "Bawang Putih",
  "Cabai",
  "Mie Instan",
  "Ayam",
  "Tahu",
  "Tempe",
  "Kecap",
  "Minyak Goreng",
  "Beras",
  "Kentang",
  "Wortel",
  "Sawi",
  "Tomat",
];

interface GeneratedResep {
  name: string;
  bahan: { nama: string; jumlah: number; satuan: string }[];
  langkah: string[];
  durasi: number;
  tingkatKesulitan: string;
  porsi: number;
  tips: string;
  kategori: string[];
}

export default function QuickStart({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const createResep = useMutation(api.resep.create);
  const addStok = useMutation(api.stok.create);

  const [step, setStep] = useState<"input" | "loading" | "results">("input");
  const [bahanInput, setBahanInput] = useState("");
  const [selectedBahan, setSelectedBahan] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedResep[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  function toggleBahan(b: string) {
    setSelectedBahan((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  }

  function getBahanList(): string {
    const fromChips = selectedBahan;
    const fromInput = bahanInput
      .split(/[,.\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const all = [...new Set([...fromChips, ...fromInput])];
    return all.join(", ");
  }

  async function handleGenerate() {
    const bahanStr = getBahanList();
    if (!bahanStr) return;
    setStep("loading");
    setError("");

    try {
      const res = await fetch("/api/ai/quick-resep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bahan: bahanStr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");

      if (!data.resep || data.resep.length === 0) {
        throw new Error("AI gak nemu resep. Coba bahan lain.");
      }

      setResults(data.resep.slice(0, 3));
      setStep("results");
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    }
  }

  async function handleSave(r: GeneratedResep) {
    if (!userId || savedIds.has(r.name)) return;
    setSaving(r.name);
    try {
      await createResep({
        userId,
        name: r.name,
        bahan: r.bahan,
        langkah: r.langkah,
        durasi: r.durasi || undefined,
        tingkatKesulitan: r.tingkatKesulitan || undefined,
        porsi: r.porsi || 2,
        tips: r.tips || "",
        kategori: r.kategori || [],
      });

      for (const b of r.bahan) {
        await addStok({
          userId,
          nama: b.nama,
          jumlah: b.jumlah,
          satuan: b.satuan || "buah",
        });
      }

      setSavedIds((prev) => new Set(prev).add(r.name));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  }

  if (step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-coral to-orange-500 shadow-lg shadow-coral/30">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
        <p className="mb-2 text-center text-lg font-semibold">
            Memasak resep untukmu...
        </p>
        <p className="text-center text-sm text-stone-400 dark:text-stone-400">
            AI sedang mikir menu dari bahan yang kamu punya
        </p>
      </div>
    );
  }

  if (step === "results") {
    return (
      <div className="pb-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-light">
            <Sparkles className="h-6 w-6 text-sage-dark" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Resep untukmu!
            </h2>
            <p className="text-sm text-stone-400 dark:text-stone-400">
              Pilih resep yang mau kamu simpan
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          {results.map((r, i) => {
            const saved = savedIds.has(r.name);
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 dark:bg-stone-800 dark:ring-stone-700"
              >
                <div className="p-5">
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className="text-base font-bold text-stone-800 dark:text-stone-100">
                      {r.name}
                    </h3>
                    <span className="rounded-lg bg-coral-light px-2 py-1 text-xs font-medium text-coral-dark">
                      {r.durasi || "?"} menit
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {r.bahan.slice(0, 8).map((b, j) => (
                      <span
                        key={j}
                        className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] text-stone-500 dark:bg-stone-700 dark:text-stone-300"
                      >
                        {b.nama}
                      </span>
                    ))}
                    {r.bahan.length > 8 && (
                      <span className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] text-stone-400 dark:bg-stone-700 dark:text-stone-400">
                        +{r.bahan.length - 8} lagi
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSave(r)}
                    disabled={saving === r.name || saved}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                      saved
                        ? "bg-sage-light text-sage-dark"
                        : "bg-coral text-white shadow-sm hover:bg-coral-dark"
                    }`}
                  >
                    {saving === r.name ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="h-4 w-4" />
                        Tersimpan
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Simpan Resep + Bahan ke Stok
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setStep("input");
              setResults([]);
              setBahanInput("");
              setSelectedBahan([]);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 transition-all active:scale-[0.98] dark:border-stone-700 dark:text-stone-300"
          >
            <X className="h-4 w-4" />
            Coba bahan lain
          </button>
          {savedIds.size > 0 && (
            <button
              onClick={onDone}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sage py-3.5 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all active:scale-[0.98]"
            >
              <ArrowRight className="h-4 w-4" />
              Lanjut ke Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-2 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-coral to-orange-500 shadow-lg shadow-coral/30">
          <Zap className="h-8 w-8 text-white" />
        </div>
      </div>

      <h2 className="mb-1 text-center text-xl font-bold tracking-tight">
        Mulai cepat!
      </h2>
      <p className="mb-6 text-center text-sm text-stone-400 dark:text-stone-400">
        Kasih tahu bahan yang ada di dapurmu, AI bikin resepnya
      </p>

      {/* Common ingredients */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">
          Bahan yang sering dipakai
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_BAHAN.map((b) => (
            <button
              key={b}
              onClick={() => toggleBahan(b)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                selectedBahan.includes(b)
                  ? "bg-coral text-white shadow-sm"
                  : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-coral dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700"
              }`}
            >
              {selectedBahan.includes(b) && (
                <Check className="mr-1 inline h-3 w-3" />
              )}
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          <span className="text-xs text-stone-300 dark:text-stone-500">atau</span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
      </div>

      {/* Free text input */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
        <input
          value={bahanInput}
          onChange={(e) => setBahanInput(e.target.value)}
          placeholder="Ketik bahan (pisah dengan koma)..."
          className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 text-sm outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/10 dark:border-stone-700 dark:bg-stone-900"
        />
      </div>

      {error && (
        <p className="mb-4 text-center text-sm text-red-500">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={selectedBahan.length === 0 && !bahanInput.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark active:scale-[0.98] disabled:opacity-50"
      >
        <Sparkles className="h-5 w-5" />
        Bikin Resep!
      </button>

      <p className="mt-4 text-center text-xs text-stone-300 dark:text-stone-500">
        Atau kamu bisa{" "}
        <button
          onClick={onDone}
          className="font-medium text-coral hover:underline"
        >
          lewati & mulai dari awal
        </button>
      </p>
    </div>
  );
}
