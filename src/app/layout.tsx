import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./ConvexClientProvider";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ResepIn — Apa yang mau dimasak hari ini?",
  description:
    "Simpan resep, atur stok dapur, dan ekstrak resep dari YouTube pakai AI.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ResepIn",
  },
};

export const viewport: Viewport = {
  themeColor: "#E85D3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} font-sans`}>
      <body className="bg-stone-50 text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
