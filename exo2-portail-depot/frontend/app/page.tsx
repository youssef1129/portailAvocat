
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isTokenValid } from "../lib/auth-storage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const target = isTokenValid() ? "/dashboard" : "/login";
    router.replace(target);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black font-sans">
      <p>Redirection en cours…</p>
    </div>
  );
}
