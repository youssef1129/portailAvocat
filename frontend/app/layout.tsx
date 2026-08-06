import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const interMono = Inter_Tight({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portail Avocat",
  description: "Portail avocat sécurisé pour dépôts et demandes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${interMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <Providers>
          <header className="w-full border-b border-[#E9E9E9] py-4 bg-white">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
              <Link href="/" className="font-semibold text-black">Portail</Link>
              <nav className="space-x-4">
                <Link href="/login" className="text-sm text-gray-600">Connexion</Link>
                <Link href="/register" className="text-sm text-gray-600">Inscription</Link>
                <Link href="/dashboard" className="text-sm text-gray-600">Dashboard</Link>
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
