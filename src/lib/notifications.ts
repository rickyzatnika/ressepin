"use client";

const VAPID_PUBLIC_KEY =
  "BIazt3PPgvePl4g64LOO0Dl2Yd9T11mangv3BOVIkP-LYV4UrlmQlp1xyKznVM80JIqDi5R36yyLg_yVjuKrn3Q";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i));
}

export function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission().then((p) => p === "granted");
}

export function sendNotification(title: string, body: string, icon?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
    });
  } catch {
    // silently fail
  }
}

export function getPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  userId: string,
  subscribeMutation: (args: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => Promise<any>,
): Promise<boolean> {
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer as ArrayBuffer,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return false;

    await subscribeMutation({
      userId,
      endpoint: json.endpoint,
      keys: {
        p256dh: (json.keys as any).p256dh,
        auth: (json.keys as any).auth,
      },
    });

    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(
  userId: string,
  unsubscribeMutation: (args: { userId: string }) => Promise<any>,
): Promise<boolean> {
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    await unsubscribeMutation({ userId });
    return true;
  } catch {
    return false;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
