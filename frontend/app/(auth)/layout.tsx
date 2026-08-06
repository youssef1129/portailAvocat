"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isTokenValid } from "../../lib/auth-storage";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (isTokenValid()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return <>{children}</>;
}
