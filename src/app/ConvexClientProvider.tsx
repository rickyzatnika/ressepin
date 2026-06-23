"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/ThemeProvider";
import InstallModal from "@/components/InstallModal";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <ThemeProvider>
          {children}
          <InstallModal />
        </ThemeProvider>
      </ConvexProvider>
    </SessionProvider>
  );
}
