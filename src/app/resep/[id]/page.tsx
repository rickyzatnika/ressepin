"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  Trash2,
  Play,
  CheckCircle2,
  Lightbulb,
  ChefHat,
  Pencil,
  PackageCheck,
  Minus,
  Plus,
} from "lucide-react";

export default function DetailResep() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const resep = useQuery(api.resep.getById, { id: id as any });
  const stokList = useQuery(api.stok.list, {
    userId: resep?.userId || "",
  });
  const deleteResep = useMutation(api.resep.remove);
  const kurangiStok = useMutation(api.stok.kurangi);
  const [showDelete, setShowDelete] = useState(false);
  const [masakMode, setMasakMode] = useState(false);
  const [currentLangkah, setCurrentLangkah] = useState(0);
  const [showStockReduce, setShowStockReduce] = useState(false);
  const [selectedBahan, setSelectedBahan] = useState<string[]>([]);
  const [porsi, setPorsi] = useState(1);

  useEffect(() => {
    if (resep?.porsi) setPorsi(resep.porsi);
  }, [resep?.porsi]);

  if (!resep) {
    return (
      <div className="flex flex-col items-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  async function handleDelete() {
    await deleteResep({ id: id as any });
    router.push("/resep");
  }

  const porsiAsli = resep.porsi || 1;
  const scale = porsi / porsiAsli;
  const displayPorsi = porsi;

  function handleCookSelesai() {
    if (!resep) return;
    setMasakMode(false);
    const adaDiStok = resep.bahan.filter((b) =>
      (stokList || []).some((s) => s.nama.toLowerCase() === b.nama.toLowerCase()),
    );
    if (adaDiStok.length > 0) {
      setSelectedBahan(adaDiStok.map((b) => b.nama));
      setShowStockReduce(true);
    }
  }

  async function handleReduceStock() {
    if (!resep) return;
    for (const nama of selectedBahan) {
      const bahan = resep.bahan.find(
        (b) => b.nama.toLowerCase() === nama.toLowerCase(),
      );
      if (bahan) {
        await kurangiStok({
          userId: resep.userId,
          nama: bahan.nama,
          jumlah: bahan.jumlah,
        });
      }
    }
    setShowStockReduce(false);
  }

  if (masakMode) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6">
        <button
          onClick={() => setMasakMode(false)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="mb-2">
          <p className="text-xs font-medium uppercase tracking-widest text-coral">
            Langkah {currentLangkah + 1} dari {resep.langkah.length}
          </p>
          <h2 className="mt-1 text-xl font-bold">{resep.name}</h2>
        </div>

        <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 pb-8 pt-12 shadow-sm ring-1 ring-stone-100">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-coral-light">
            {currentLangkah === resep.langkah.length - 1 ? (
              <CheckCircle2 className="h-10 w-10 text-coral" />
            ) : (
              <span className="text-3xl font-bold text-coral">
                {currentLangkah + 1}
              </span>
            )}
          </div>

          <p className="mb-10 text-center text-lg leading-relaxed">
            {resep.langkah[currentLangkah]}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={() => setCurrentLangkah(Math.max(0, currentLangkah - 1))}
              disabled={currentLangkah === 0}
              className="flex-1 rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 transition-all disabled:opacity-30 active:scale-[0.98]"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => {
                if (currentLangkah < resep.langkah.length - 1) {
                  setCurrentLangkah(currentLangkah + 1);
                } else {
                  handleCookSelesai();
                }
              }}
              className="flex-1 rounded-xl bg-coral py-3.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
            >
              {currentLangkah < resep.langkah.length - 1
                ? "Selanjutnya"
                : "Selesai"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6">
      <div className="mb-1 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/resep/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-red-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      </div>

      <div className="relative mb-6 mt-3 aspect-[2/1] overflow-hidden rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50">
        {resep.foto ? (
          <Image
            src={resep.foto}
            alt={resep.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-14 w-14 text-stone-200" />
          </div>
        )}
      </div>

      <h1 className="mb-3 text-2xl font-bold tracking-tight">{resep.name}</h1>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-coral-light px-3 py-1.5 text-xs font-medium text-coral-dark">
          <Clock className="h-3.5 w-3.5" />
          {resep.durasi || "?"} menit
        </span>
        {resep.tingkatKesulitan && (
          <span className="rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500">
            {resep.tingkatKesulitan}
          </span>
        )}
        <span className="rounded-xl bg-sage-light px-3 py-1.5 text-xs font-medium text-sage-dark">
          {resep.bahan.length} bahan
        </span>

        {/* Porsi selector */}
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-white px-2 py-1 ring-1 ring-stone-200">
          <button
            onClick={() => setPorsi(Math.max(1, porsi - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-semibold">{porsi}</span>
          <button
            onClick={() => setPorsi(Math.min(20, porsi + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {resep.kategori?.map((k) => (
          <span key={k} className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
            {k}
          </span>
        ))}
      </div>

      <div className="grid gap-7 md:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
            Bahan
          </h3>
          <div className="rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-stone-100">
            {resep.bahan.map((b, i) => {
              const scaled = b.jumlah * scale;
              const hasQty = b.jumlah > 0 && b.satuan;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-stone-50 py-3 last:border-0"
                >
                  <span className="text-sm font-medium">{b.nama}</span>
                  {hasQty ? (
                    <span className="text-sm text-stone-400">
                      {scale !== 1 && (
                        <span className="mr-1 text-xs text-stone-300 line-through">
                          {b.jumlah === Math.floor(b.jumlah) ? b.jumlah : b.jumlah}{" "}
                          {b.satuan}
                        </span>
                      )}
                      {scaled === Math.floor(scaled) ? scaled : scaled.toFixed(1)}{" "}
                      {b.satuan}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-300">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
            Langkah
          </h3>
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-100">
            {resep.langkah.map((l, i) => (
              <div key={i} className="mb-5 flex gap-3 last:mb-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-coral-light text-xs font-bold text-coral">
                  {i + 1}
                </div>
                <p className="pt-0.5 text-sm leading-relaxed text-stone-600">{l}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {resep.tips && (
        <div className="mb-7 mt-7 flex gap-3 rounded-2xl bg-amber-50 px-5 py-4">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm leading-relaxed text-amber-800">{resep.tips}</p>
        </div>
      )}

      <button
        onClick={() => setMasakMode(true)}
        className="mb-10 mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-4 text-base font-semibold text-white shadow-lg shadow-coral/25 transition-all active:scale-[0.98]"
      >
        <Play className="h-5 w-5 fill-white" />
        Mulai Masak
      </button>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-5 pb-12 sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-3xl bg-white px-6 pb-6 pt-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <p className="mb-1 text-base font-semibold">Hapus resep?</p>
            <p className="mb-7 text-sm text-stone-400">
              Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-medium text-stone-600 transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock reduction modal */}
      {showStockReduce && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-5 pb-12 sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-3xl bg-white px-6 pb-6 pt-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-light">
              <PackageCheck className="h-7 w-7 text-sage-dark" />
            </div>
            <p className="mb-1 text-base font-semibold">Kurangi stok?</p>
            <p className="mb-5 text-sm text-stone-400">
              Bahan yang terpakai untuk resep ini:
            </p>
            <div className="mb-6 space-y-2 text-left">
              {resep.bahan
                .filter((b) =>
                  (stokList || []).some(
                    (s) => s.nama.toLowerCase() === b.nama.toLowerCase(),
                  ),
                )
                .map((b) => (
                  <label
                    key={b.nama}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-stone-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBahan.includes(b.nama)}
                      onChange={() =>
                        setSelectedBahan((prev) =>
                          prev.includes(b.nama)
                            ? prev.filter((n) => n !== b.nama)
                            : [...prev, b.nama],
                        )
                      }
                      className="h-5 w-5 rounded-lg border-stone-300 accent-coral"
                    />
                    <div className="flex w-full items-center justify-between text-sm">
                      <span>{b.nama}</span>
                      {b.jumlah > 0 && b.satuan ? (
                        <span className="text-stone-400">
                          -{b.jumlah} {b.satuan}
                        </span>
                      ) : null}
                    </div>
                  </label>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStockReduce(false)}
                className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-medium text-stone-600 transition-all active:scale-95"
              >
                Lewati
              </button>
              <button
                onClick={handleReduceStock}
                className="flex-1 rounded-xl bg-sage py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
              >
                Kurangi Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
