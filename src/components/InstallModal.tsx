"use client";

import { useEffect, useState } from "react";
import { Download, X, MonitorSmartphone } from "lucide-react";

const LS_INSTALLED = "resepin_installed";
const LS_DISMISSED = "resepin_install_dismissed";
const DISMISS_HOURS = 24;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_INSTALLED)) return;

    const dismissed = localStorage.getItem(LS_DISMISSED);
    if (dismissed) {
      const elapsed = Date.now() - Number(dismissed);
      if (elapsed < DISMISS_HOURS * 60 * 60 * 1000) return;
    }

    function handler(e: Event) {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(prompt);
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    function handler() {
      localStorage.setItem(LS_INSTALLED, "1");
      setShow(false);
    }
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        localStorage.setItem(LS_INSTALLED, "1");
      }
      setDeferredPrompt(null);
      setShow(false);
    });
  }

  function handleDismiss() {
    localStorage.setItem(LS_DISMISSED, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-800">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-light/30">
            <MonitorSmartphone className="h-6 w-6 text-coral" />
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-700 dark:text-stone-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mb-1 text-lg font-bold">Install ResepIn</h3>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Pasang di layar utama untuk akses lebih cepat. Bisa dipake offline!
        </p>

        <div className="space-y-2">
          <button
            onClick={handleInstall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral py-3 text-sm font-semibold text-white shadow-lg shadow-coral/25 transition-all hover:bg-coral-dark active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            Pasang Sekarang
          </button>
          <button
            onClick={handleDismiss}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-sm font-semibold text-stone-500 transition-all hover:bg-stone-200 active:scale-[0.99] dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
