"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isTokenValid } from "../../lib/auth-storage";

export default function LawyerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isTokenValid()) {
      router.replace("/login");
    }
  }, [router]);

  return <>{children}</>;
}
