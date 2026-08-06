import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import { Scale } from "lucide-react";
import ProfileMenuClient from "../components/ui/ProfileMenuClient";


const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portail de Dépôt de Pièces - Avocat",
  description: "Portail avocat sécurisé pour la collecte et le dépôt de pièces justificatives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F6FF] text-[#000000]">
        <Providers>
          <header className="w-full border-b border-[#E9E9E9] bg-white sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 text-base font-semibold text-black hover:text-[#5100FF] transition-colors duration-150">
                <div className="w-9 h-9 rounded-lg bg-[#F7F6FF] text-[#5100FF] border border-[#E9E9E9] flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="font-semibold text-lg">Portail Avocat</span>
              </Link>
              <div className="flex items-center gap-3">
                <ProfileMenuClient />
              </div>
            </div>
          </header>
          <main className="flex-1 w-full flex flex-col max-h-[calc(100dvh_-_70px)] p-2.5">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
