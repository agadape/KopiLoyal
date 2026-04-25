import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "KopiLoyalty",
  description: "Web3 loyalty app untuk cafe lokal — dibangun di Monad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-latte-light min-h-screen">
        <Providers>
          <main className="max-w-md mx-auto min-h-screen pb-20">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
