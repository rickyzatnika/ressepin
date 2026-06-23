"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChefHat, Package, Sparkles, ClipboardList } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-coral to-orange-500 shadow-lg shadow-coral/30">
          <ChefHat className="h-11 w-11 text-white" />
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">ResepIn</h1>
        <p className="mb-1 text-center text-stone-500 dark:text-stone-400">
          Bingung mau masak apa hari ini?
        </p>
        <p className="mb-10 text-center text-sm text-stone-400 dark:text-stone-400">
          AI Chef yang bikin resep dari bahan dapurmu. Ekstrak YouTube. Atur stok. Rencanakan menu mingguan.
        </p>

        <button
          onClick={() => signIn("google", { redirectTo: "/dashboard" })}
          className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-8 py-3.5 font-semibold text-stone-700 shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Lanjut dengan Google
        </button>
      </div>

      <div className="border-t border-stone-100 bg-white px-8 py-6 dark:border-stone-700 dark:bg-stone-800">
        <div className="mx-auto flex max-w-xs items-center justify-between text-center text-xs text-stone-400 dark:text-stone-400">
          <div className="flex flex-col items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-coral" />
            AI Chef Pintar
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Package className="h-5 w-5 text-sage" />
            Atur Stok
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ClipboardList className="h-5 w-5 text-coral" />
            Meal Planner
          </div>
        </div>
      </div>
    </div>
  );
}
