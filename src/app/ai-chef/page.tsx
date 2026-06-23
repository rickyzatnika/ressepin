"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import {
  Sparkles,
  Film,
  ChefHat,
  Lightbulb,
  Replace,
  MessageSquare,
  Trash2,
  Loader2,
  Plus,
  Search,
  CalendarCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";

const capabilities = [
  {
    icon: Film,
    label: "Ekstrak Resep dari Link",
    description: "Paste link YouTube, Cookpad, atau website resep",
    prompt: "https://www.youtube.com/watch?v=",
    color: "from-coral to-orange-500",
  },
  {
    icon: Search,
    label: "Saran Resep",
    description: "Sebutkan bahan yang ada, AI akan kasih ide masakan",
    prompt: "Apa yang bisa saya masak dengan bahan ",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: ChefHat,
    label: "Tips & Trik Masak",
    description: "Tanya tentang teknik memasak, tips dapur, dan lainnya",
    prompt: "Bagaimana cara memasak ",
    color: "from-sage to-green-700",
  },
  {
    icon: Replace,
    label: "Ganti Bahan",
    description: "Cari substitusi bahan yang tidak punya",
    prompt: "Apa pengganti ",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: CalendarCheck,
    label: "Meal Planner",
    description: "Buat rencana menu mingguan dengan AI",
    prompt: "/meal-planner",
    color: "from-amber-500 to-orange-500",
    isLink: true,
  },
];

const quickPrompts = [
  "Resep sarapan praktis 5 menit",
  "Ide masakan dari ayam dan sayur",
  "Tips membuat nasi goreng yang enak",
  "Resep kue tanpa oven",
  "Apa pengganti santan?",
  "Cara membuat mie goreng ala restoran",
];

function TypewriterText({ texts, onDone }: { texts: string[]; onDone: () => void }) {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    if (!current) return;

    const speed = isDeleting ? 20 : 50 + Math.random() * 30;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < current.length) {
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (charIndex > 0) {
          setCharIndex((c) => c - 1);
        } else {
          setIsDeleting(false);
          if (textIndex < texts.length - 1) {
            setTextIndex((t) => t + 1);
          } else {
            onDone();
          }
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [textIndex, charIndex, isDeleting, texts, onDone]);

  return <span>{texts[textIndex]?.slice(0, charIndex)}<span className="animate-pulse">|</span></span>;
}

export default function AIChefLandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [typingDone, setTypingDone] = useState(false);

  const conversations = useQuery(
    api.conversations.list,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );
  const createConversation = useMutation(api.conversations.create);
  const removeConversation = useMutation(api.conversations.remove);
  const renameConversation = useMutation(api.conversations.updateTitle);

  const [editingId, setEditingId] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  async function startNewChat(prompt?: string) {
    if (!session?.user?.id) return;
    const title = prompt ? prompt.slice(0, 60) : "Chat baru";
    const convId = await createConversation({ userId: session.user.id, title });
    router.push(`/ai-chef/${convId}${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ""}`);
  }

  async function handleDelete(e: React.MouseEvent, id: any) {
    e.stopPropagation();
    await removeConversation({ id });
  }

  async function handleRename(id: any) {
    if (!editValue.trim()) { setEditingId(null); return; }
    await renameConversation({ id, title: editValue.trim() });
    setEditingId(null);
  }

  function startEditing(e: React.MouseEvent, id: any, currentTitle: string) {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentTitle);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 sm:px-6 lg:px-8 pt-6" style={{ height: "calc(100dvh - 3.5rem)" }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-orange-500 shadow-md">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Chef</h1>
          <p className="text-xs text-stone-400 dark:text-stone-400">Asisten masak pintar kamu</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-24 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        {/* Typewriter Greeting */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-coral to-orange-500 p-5 text-white shadow-lg">
          <p className="text-lg font-bold mb-1">Halo, {session?.user?.name || "Chef"}! 👋</p>
          <p className="text-sm text-white/80 min-h-[1.5rem]">
            {!typingDone ? (
              <TypewriterText
                texts={[
                  "Mau masak apa hari ini?",
                  "Paste link resep, AI extract otomatis!",
                  "Sebutin bahan, AI Chef kasih ide masakan!",
                  "Tanya apa aja tentang masak-memasak!",
                ]}
                onDone={() => setTypingDone(true)}
              />
            ) : (
              <span>Apa yang ingin kamu masak hari ini? 🧑‍🍳</span>
            )}
          </p>
        </div>

        {/* New Chat Button */}
        <button onClick={() => startNewChat()}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 transition-all hover:border-coral hover:text-coral active:scale-[0.98] dark:border-stone-700 dark:text-stone-400">
          <Plus className="h-4 w-4" /> Chat Baru
        </button>

        {/* Capability Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {capabilities.map((cap) => {
            if (cap.isLink) {
              return (
                <a key={cap.label} href={cap.prompt}
                  className="group cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800">
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${cap.color} text-white shadow-sm`}>
                    <cap.icon className="h-4 w-4" />
                  </div>
                  <p className="mb-0.5 text-sm font-bold text-stone-700 dark:text-stone-200">{cap.label}</p>
                  <p className="text-[11px] leading-snug text-stone-400 dark:text-stone-400">{cap.description}</p>
                </a>
              );
            }
            return (
                <button key={cap.label} onClick={() => startNewChat(cap.prompt)}
                  className="group rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800">
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${cap.color} text-white shadow-sm`}>
                    <cap.icon className="h-4 w-4" />
                  </div>
                  <p className="mb-0.5 text-sm font-bold text-stone-700 dark:text-stone-200">{cap.label}</p>
                  <p className="text-[11px] leading-snug text-stone-400 dark:text-stone-400">{cap.description}</p>
              </button>
            );
          })}
        </div>

        {/* Quick Prompts */}
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">Coba tanya</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => startNewChat(prompt)}
                className="rounded-xl bg-stone-100 px-3 py-1.5 text-xs text-stone-500 transition-all hover:bg-coral hover:text-white active:scale-95 dark:bg-stone-700 dark:text-stone-300">
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">Riwayat Chat</p>
          {!conversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-stone-200 dark:text-stone-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 py-8 text-center dark:border-stone-700">
              <MessageSquare className="mx-auto mb-2 h-5 w-5 text-stone-200 dark:text-stone-600" />
              <p className="text-xs text-stone-300 dark:text-stone-500">Belum ada chat</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((conv) => (
                <div key={conv._id}
                  onClick={() => { if (editingId !== conv._id) router.push(`/ai-chef/${conv._id}`); }}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-stone-100 active:scale-[0.99] dark:hover:bg-stone-700">
                  <MessageSquare className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-500" />
                  {editingId === conv._id ? (
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(conv._id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1 text-sm outline-none focus:border-coral dark:border-stone-700 dark:bg-stone-900"
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleRename(conv._id); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-sage hover:bg-sage-light">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-stone-300 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="flex-1 truncate text-sm text-stone-600 dark:text-stone-300">{conv.title}</p>
                  )}
                  <button onClick={(e) => startEditing(e, conv._id, conv.title)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-300 hover:bg-stone-100 hover:text-stone-500 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => handleDelete(e, conv._id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-300 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Nav />
    </div>
  );
}
