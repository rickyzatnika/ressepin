"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Film,
  ChefHat,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { KONTEKS_KATEGORI } from "@/lib/kategori";

export default function TambahResep() {
  const { data: session } = useSession();
  const createResep = useMutation(api.resep.create);
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({
    name: "",
    durasi: "",
    tingkatKesulitan: "",
    porsi: "",
    foto: "",
    bahan: [{ nama: "", jumlah: 0, satuan: "" }],
    langkah: [""],
    tips: "",
    kategori: [] as string[],
  });

  async function handleYoutubeExtract() {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/extract-resep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, userId: session?.user?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || "",
          durasi: data.durasi?.toString() || "",
          tingkatKesulitan: data.tingkatKesulitan || "",
          porsi: data.porsi?.toString() || "",
          foto: data.foto || "",
          bahan: data.bahan?.length > 0
            ? data.bahan.map((b: any) => ({
                nama: b.nama || "",
                jumlah: b.jumlah ?? 0,
                satuan: b.satuan || "",
              }))
            : [{ nama: "", jumlah: 0, satuan: "" }],
          langkah: data.langkah?.length > 0
            ? data.langkah.map((l: any) => l || "")
            : [""],
          tips: data.tips || "",
          kategori: data.kategori || [],
        });
        setManual(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;

    await createResep({
      userId: session.user.id,
      name: form.name,
      bahan: form.bahan.filter((b) => b.nama.trim()),
      langkah: form.langkah.filter((l) => l.trim()),
      tips: form.tips || undefined,
      foto: form.foto || undefined,
      porsi: form.porsi ? parseInt(form.porsi) : undefined,
      durasi: form.durasi ? parseInt(form.durasi) : undefined,
      tingkatKesulitan: form.tingkatKesulitan || undefined,
      kategori: form.kategori,
      youtubeUrl: youtubeUrl || undefined,
    });

    router.push("/resep");
  }

  function addBahan() {
    setForm((f) => ({
      ...f,
      bahan: [...f.bahan, { nama: "", jumlah: 0, satuan: "" }],
    }));
  }

  function addLangkah() {
    setForm((f) => ({ ...f, langkah: [...f.langkah, ""] }));
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 pt-6">
      <div className="mb-6 inline-flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Tambah Resep</h1>
      </div>

      {!manual && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700">
            <Film className="h-5 w-5 text-red-400" />
            Ekstrak dari YouTube
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-coral"
            />
            <button
              onClick={handleYoutubeExtract}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ekstrak"
              )}
            </button>
          </div>
          <button
            onClick={() => setManual(true)}
            className="mt-2 text-xs font-medium text-coral hover:text-coral-dark"
          >
            Atau isi manual &rarr;
          </button>
        </div>
      )}

      {(manual || form.name) && (
        <form onSubmit={handleSubmit} className="pb-10">
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Nama Resep
            </label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral"
              placeholder="Contoh: Nasi Goreng Spesial"
              required
            />
          </div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
                Durasi (mnt)
              </label>
              <input
                type="number"
                value={form.durasi}
                onChange={(e) => setForm((f) => ({ ...f, durasi: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral"
                placeholder="30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
                Porsi
              </label>
              <input
                type="number"
                value={form.porsi}
                onChange={(e) => setForm((f) => ({ ...f, porsi: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral"
                placeholder="2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
                Kesulitan
              </label>
              <select
                value={form.tingkatKesulitan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tingkatKesulitan: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral"
              >
                <option value="">Pilih</option>
                <option value="Mudah">Mudah</option>
                <option value="Sedang">Sedang</option>
                <option value="Sulit">Sulit</option>
              </select>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Bahan
              </label>
              <button
                type="button"
                onClick={addBahan}
                className="inline-flex items-center gap-1 text-xs font-medium text-coral hover:text-coral-dark"
              >
                <Plus className="h-3 w-3" />
                Tambah
              </button>
            </div>
            <div className="space-y-2">
              {form.bahan.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Nama bahan"
                    value={b.nama}
                    onChange={(e) => {
                      const bahan = [...form.bahan];
                      bahan[i].nama = e.target.value;
                      setForm((f) => ({ ...f, bahan }));
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-coral"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    value={b.jumlah || ""}
                    onChange={(e) => {
                      const bahan = [...form.bahan];
                      bahan[i].jumlah = parseFloat(e.target.value) || 0;
                      setForm((f) => ({ ...f, bahan }));
                    }}
                    className="w-16 rounded-xl border border-stone-200 px-2 py-2.5 text-center text-sm outline-none transition-colors focus:border-coral"
                  />
                  <input
                    placeholder="gr"
                    value={b.satuan}
                    onChange={(e) => {
                      const bahan = [...form.bahan];
                      bahan[i].satuan = e.target.value;
                      setForm((f) => ({ ...f, bahan }));
                    }}
                    className="w-16 rounded-xl border border-stone-200 px-2 py-2.5 text-center text-sm outline-none transition-colors focus:border-coral"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Langkah
              </label>
              <button
                type="button"
                onClick={addLangkah}
                className="inline-flex items-center gap-1 text-xs font-medium text-coral hover:text-coral-dark"
              >
                <Plus className="h-3 w-3" />
                Tambah
              </button>
            </div>
            <div className="space-y-2">
              {form.langkah.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2.5 w-5 text-xs font-bold text-stone-300">
                    {i + 1}.
                  </span>
                  <textarea
                    placeholder="Langkah memasak..."
                    value={l}
                    onChange={(e) => {
                      const langkah = [...form.langkah];
                      langkah[i] = e.target.value;
                      setForm((f) => ({ ...f, langkah }));
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-coral"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Kategori */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Kategori
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {KONTEKS_KATEGORI.map((ctx) => {
                const active = form.kategori.includes(ctx.label);
                return (
                  <button
                    key={ctx.label}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        kategori: active
                          ? f.kategori.filter((k) => k !== ctx.label)
                          : [...f.kategori, ctx.label],
                      }))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-coral text-white shadow-sm"
                        : "bg-white text-stone-500 ring-1 ring-stone-200 hover:ring-coral/30"
                    }`}
                  >
                    <span>{ctx.icon}</span>
                    {ctx.label}
                  </button>
                );
              })}
            </div>
            {form.kategori.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.kategori.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-lg bg-coral-light px-2 py-1 text-[11px] font-medium text-coral-dark"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          kategori: f.kategori.filter((x) => x !== k),
                        }))
                      }
                      className="ml-0.5 hover:text-coral"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              placeholder="Tambah kategori sendiri (pisah dengan koma)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setForm((f) => ({
                      ...f,
                      kategori: [...f.kategori, ...val.split(",").map((s) => s.trim()).filter(Boolean)],
                    }));
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) {
                  setForm((f) => ({
                    ...f,
                    kategori: [...f.kategori, ...val.split(",").map((s) => s.trim()).filter(Boolean)],
                  }));
                  e.target.value = "";
                }
              }}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs outline-none transition-colors focus:border-coral placeholder:text-stone-300"
            />
          </div>

          <div className="mb-8">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Tips (opsional)
            </label>
            <textarea
              value={form.tips}
              onChange={(e) =>
                setForm((f) => ({ ...f, tips: e.target.value }))
              }
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral"
              rows={2}
              placeholder="Tips agar masakan lebih enak..."
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-base font-semibold text-white shadow-lg shadow-coral/20 transition-all active:scale-[0.98]"
          >
            <ChefHat className="h-5 w-5" />
            Simpan Resep
          </button>
        </form>
      )}
    </div>
  );
}
