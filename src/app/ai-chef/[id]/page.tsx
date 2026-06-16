"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Save,
  ExternalLink,
  User,
  ArrowLeft,
  Plus,
  Check,
  Package,
} from "lucide-react";

const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
function extractVideoId(text: string): string | null {
  const m = text.match(YOUTUBE_REGEX);
  return m ? m[1] : null;
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    let i = 0;
    const speed = text.length > 200 ? 5 : text.length > 100 ? 8 : 12;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        doneRef.current = true;
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="mt-1 mb-1 list-disc pl-4 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-1 mb-1 list-decimal pl-4 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
        h2: ({ children }) => <p className="mt-2 mb-1 text-sm font-bold">{children}</p>,
        h3: ({ children }) => <p className="mt-1.5 mb-0.5 text-sm font-semibold">{children}</p>,
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        code: ({ children }) => (
          <code className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-mono text-stone-600">{children}</code>
        ),
      }}
    >
      {displayed}
    </ReactMarkdown>
  );
}

export default function ChatDetailPage() {
  const { data: session } = useSession();
  const { id } = useParams<{ id: string }>();
  const conversationId = id as any;
  const router = useRouter();

  const createResep = useMutation(api.resep.create);
  const createStok = useMutation(api.stok.create);
  const sendMessage = useMutation(api.messages.send);
  const updateTitle = useMutation(api.conversations.updateTitle);

  const messages = useQuery(api.messages.list, conversationId ? { conversationId } : "skip");

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [addingStok, setAddingStok] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptSentRef = useRef(false);

  // Auto-send prompt from query param
  useEffect(() => {
    if (!session?.user?.id || promptSentRef.current || messages === undefined) return;
    if (messages.length > 0) { promptSentRef.current = true; return; }
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    if (!prompt) { promptSentRef.current = true; return; }
    promptSentRef.current = true;
    (async () => {
      await sendMessage({ conversationId, userId: session.user.id, role: "user", content: prompt });
      updateTitle({ id: conversationId, title: prompt.slice(0, 60) });
      const videoId = prompt.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (videoId) {
        await sendMessage({
          conversationId, userId: session.user.id, role: "assistant",
          content: "🔍 Lagi extract resep dari video YouTube...",
        });
        try {
          const res = await fetch("/api/ai/extract-resep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: prompt, userId: session.user.id }),
          });
          if (res.ok) {
            const data = await res.json();
            await sendMessage({
              conversationId, userId: session.user.id, role: "assistant",
              content: `✅ Berhasil extract resep **${data.name}**!\n\n${data.bahan?.length || 0} bahan, ${data.langkah?.length || 0} langkah.`,
              resep: data,
            });
          } else {
            const err = await res.json().catch(() => ({ error: "Gagal extract" }));
            await sendMessage({
              conversationId, userId: session.user.id, role: "assistant",
              content: `❌ ${err.error || "Gagal extract resep dari video."}`,
            });
          }
        } catch {
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: "❌ Gagal terhubung ke server.",
          });
        }
      } else {
        try {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: prompt }],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            await sendMessage({
              conversationId, userId: session.user.id, role: "assistant",
              content: data.content, searched: data.searched,
              resep: data.extracted || undefined,
            });
          } else {
            await sendMessage({
              conversationId, userId: session.user.id, role: "assistant",
              content: "Maaf, AI sedang sibuk. Coba lagi ya.",
            });
          }
        } catch {
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: "Gagal terhubung ke server.",
          });
        }
      }
    })();
  }, [messages, session?.user?.id, conversationId, sendMessage, updateTitle]);

  // Auto-scroll MutationObserver
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let userScrolledUp = false;
    let rafId = 0;
    const onScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUp = !atBottom;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    const scroll = () => { rafId = 0; container.scrollTop = container.scrollHeight; };
    const schedule = () => { if (!userScrolledUp && !rafId) rafId = requestAnimationFrame(scroll); };
    const observer = new MutationObserver(schedule);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    container.addEventListener("load", schedule, true);
    schedule();
    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("load", schedule, true);
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !session?.user?.id) return;
    setInput("");
    setSending(true);

    await sendMessage({ conversationId, userId: session.user.id, role: "user", content: text });

    if (messages?.length === 0) {
      updateTitle({ id: conversationId, title: text.slice(0, 60) });
    }

    const videoId = extractVideoId(text);

    if (videoId) {
      await sendMessage({
        conversationId, userId: session.user.id, role: "assistant",
        content: "🔍 Lagi extract resep dari video YouTube...",
      });
      try {
        const res = await fetch("/api/ai/extract-resep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: text, userId: session.user.id }),
        });
        if (res.ok) {
          const data = await res.json();
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: `✅ Berhasil extract resep **${data.name}**!\n\n${data.bahan?.length || 0} bahan, ${data.langkah?.length || 0} langkah.`,
            resep: data,
          });
        } else {
          const err = await res.json().catch(() => ({ error: "Gagal extract" }));
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: `❌ ${err.error || "Gagal extract resep dari video."}`,
          });
        }
      } catch {
        await sendMessage({
          conversationId, userId: session.user.id, role: "assistant",
          content: "❌ Gagal terhubung ke server.",
        });
      }
    } else {
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...(messages || []), { role: "user", content: text }].map((m: any) => ({
              role: m.role, content: m.content,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: data.content, searched: data.searched,
            resep: data.extracted || undefined,
          });
        } else {
          await sendMessage({
            conversationId, userId: session.user.id, role: "assistant",
            content: "Maaf, AI sedang sibuk. Coba lagi ya.",
          });
        }
      } catch {
        await sendMessage({
          conversationId, userId: session.user.id, role: "assistant",
          content: "Gagal terhubung ke server.",
        });
      }
    }
    setSending(false);
  }

  async function handleSaveResep(resep: any) {
    if (!session?.user?.id || saving) return;
    setSaving(resep.name);
    try {
      await createResep({
        userId: session.user.id,
        name: resep.name,
        bahan: resep.bahan || [],
        langkah: resep.langkah || [],
        tips: resep.tips || undefined,
        foto: resep.foto || undefined,
        porsi: resep.porsi ? parseInt(resep.porsi) : undefined,
        durasi: resep.durasi || undefined,
        tingkatKesulitan: resep.tingkatKesulitan || undefined,
        kategori: resep.kategori || [],
        youtubeUrl: resep.youtubeUrl || undefined,
      });
      await sendMessage({
        conversationId, userId: session.user.id, role: "assistant",
        content: `✅ **${resep.name}** berhasil disimpan! Buka di halaman [Resep](/resep).`,
      });
    } catch {
      await sendMessage({
        conversationId, userId: session.user.id, role: "assistant",
        content: "❌ Gagal menyimpan resep.",
      });
    }
    setSaving(null);
  }

  async function handleAddToStock(nama: string, jumlah: number, satuan: string) {
    if (!session?.user?.id || addingStok) return;
    setAddingStok(nama);
    try {
      await createStok({ userId: session.user.id, nama, jumlah, satuan });
      await sendMessage({
        conversationId, userId: session.user.id, role: "assistant",
        content: `✅ **${nama}** (${jumlah} ${satuan}) ditambahkan ke stok!`,
      });
    } catch {
      await sendMessage({
        conversationId, userId: session.user.id, role: "assistant",
        content: `❌ Gagal menambahkan ${nama} ke stok.`,
      });
    }
    setAddingStok(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isSingleRecipe = (r: any) => r && r.name && r.bahan;
  const hasExtracted = (r: any) => r && (r.recipes || r.ingredients);

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 sm:px-6 lg:px-8 pt-4" style={{ height: "calc(100dvh - 5rem)" }}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => router.push("/ai-chef")} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-coral to-orange-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight">AI Chef</h1>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-4 space-y-4 scrollbar-thin">
        {!messages ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bot className="mb-3 h-10 w-10 text-coral" />
            <p className="text-sm font-medium text-stone-500">Mulai chat dengan AI Chef</p>
            <p className="text-xs text-stone-300 mt-1">Paste link YouTube atau tanya resep</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const resepData = (msg as any).resep;
            const isSingle = resepData && isSingleRecipe(resepData);
            const isExtracted = resepData && hasExtracted(resepData);

            return (
            <div key={msg._id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-coral text-white rounded-br-md"
                  : "bg-white shadow-sm ring-1 ring-stone-100 rounded-bl-md"
              }`}>
                <div className="mb-1 flex items-center gap-1.5">
                  {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-coral" /> : <User className="h-3.5 w-3.5 text-white/70" />}
                  <span className={`text-[10px] font-medium ${msg.role === "user" ? "text-white/70" : "text-stone-400"}`}>
                    {msg.role === "assistant" ? "AI Chef" : "Kamu"}
                  </span>
                  {(msg as any).searched && <span className="text-[10px] text-stone-300">· 🌐</span>}
                </div>

                <div className={`text-sm leading-relaxed ${msg.role === "user" ? "text-white" : "text-stone-700"}`}>
                  {msg.role === "assistant" ? (
                    isSingle || isExtracted ? (
                      <ReactMarkdown components={{ strong: ({ children }) => <strong className="font-semibold">{children}</strong>, p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p> }}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : i === messages.length - 1 ? (
                      <TypewriterText text={msg.content} />
                    ) : (
                      <ReactMarkdown components={{
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="mt-1 mb-1 list-disc pl-4 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="mt-1 mb-1 list-decimal pl-4 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                        h2: ({ children }) => <p className="mt-2 mb-1 text-sm font-bold">{children}</p>,
                        h3: ({ children }) => <p className="mt-1.5 mb-0.5 text-sm font-semibold">{children}</p>,
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        code: ({ children }) => <code className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-mono text-stone-600">{children}</code>,
                      }}>
                        {msg.content}
                      </ReactMarkdown>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {/* Recipe card: Single (YouTube) */}
                {isSingle && (
                  <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    {resepData.foto && (
                      <img src={resepData.foto} alt={resepData.name} className="mb-2 h-32 w-full rounded-lg object-cover" />
                    )}
                    <p className="mb-1.5 text-sm font-bold">{resepData.name}</p>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {resepData.durasi > 0 && (
                        <span className="rounded-lg bg-coral-light px-2 py-0.5 text-[10px] font-medium text-coral-dark">{resepData.durasi} mnt</span>
                      )}
                      <span className="rounded-lg bg-sage-light px-2 py-0.5 text-[10px] font-medium text-sage-dark">{resepData.bahan?.length || 0} bahan</span>
                      <span className="rounded-lg bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">{resepData.langkah?.length || 0} langkah</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveResep(resepData)} disabled={saving === resepData.name}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-coral py-2 text-xs font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50">
                        {saving === resepData.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {saving === resepData.name ? "Menyimpan..." : "Simpan Resep"}
                      </button>
                      {resepData.youtubeUrl && (
                        <a href={resepData.youtubeUrl} target="_blank"
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-500 transition-all hover:bg-stone-100">
                          <ExternalLink className="h-3.5 w-3.5" /> Video
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Action cards: Extracted (Chat) */}
                {isExtracted && (
                  <div className="mt-3 space-y-2">
                    {/* Recipes */}
                    {resepData.recipes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Resep dari AI Chef</p>
                        {resepData.recipes.map((r: any, j: number) => (
                          <div key={j} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                            {r.foto && (
                              <img src={r.foto} alt={r.name} className="mb-2 h-28 w-full rounded-lg object-cover" />
                            )}
                            <p className="mb-1 text-sm font-bold">{r.name}</p>
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {r.durasi && <span className="rounded-lg bg-coral-light px-2 py-0.5 text-[10px] font-medium text-coral-dark">{r.durasi} mnt</span>}
                              <span className="rounded-lg bg-sage-light px-2 py-0.5 text-[10px] font-medium text-sage-dark">{r.bahan?.length || 0} bahan</span>
                              <span className="rounded-lg bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">{r.langkah?.length || 0} langkah</span>
                            </div>
                            <button onClick={() => handleSaveResep(r)} disabled={saving === r.name}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-coral py-2 text-xs font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50">
                              {saving === r.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              {saving === r.name ? "Menyimpan..." : "Simpan Resep"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Additional ingredients */}
                    {resepData.ingredients?.length > 0 && (
                      <div className="rounded-xl border border-stone-200 bg-amber-50 p-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600">Bahan tambahan yang diperlukan</p>
                        <div className="flex flex-wrap gap-2">
                          {resepData.ingredients.map((b: any, j: number) => (
                            <button key={j} onClick={() => handleAddToStock(b.nama, b.jumlah || 1, b.satuan || "")}
                              disabled={addingStok === b.nama}
                              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200 transition-all hover:bg-stone-100 active:scale-95 disabled:opacity-50">
                              {addingStok === b.nama ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Package className="h-3 w-3 text-amber-500" />
                              )}
                              {b.nama}{b.jumlah ? ` (${b.jumlah} ${b.satuan})` : ""}
                              <Plus className="h-3 w-3 text-stone-300" />
                            </button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[10px] text-amber-400">Klik bahan untuk tambah ke stok</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100">
              <Bot className="h-3.5 w-3.5 text-coral mb-1" />
              <p className="text-sm text-stone-400 animate-pulse">Wait, nuju mikir..</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 pt-2 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 shadow-sm">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={sending ? "AI sedang berpikir..." : "Paste link YouTube atau tanya resep..."}
            disabled={sending}
            className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-stone-300 disabled:opacity-50" />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral text-white transition-all active:scale-90 disabled:opacity-30">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-stone-300">AI Chef bisa saja tidak akurat. Verifikasi resep sebelum memasak.</p>
      </div>
    </div>
  );
}
