"use client";

import React, { useEffect, useState } from "react";
import { getTokenPayload, clearAuthToken } from "../../lib/auth-storage";
import { useRouter } from "next/navigation";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();

  useEffect(() => {
    setPayload(getTokenPayload());
  }, []);

  const name = (payload && (payload.name as string)) || (payload && (payload.username as string)) || null;
  const email = (payload && (payload.email as string)) || null;

  const initials = name
    ? name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : email
    ? (email as string)[0].toUpperCase()
    : "U";

  function handleLogout() {
    clearAuthToken();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-3 rounded-full border border-[#E9E9E9] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F7F6FF] transition"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-[#F7F6FF] text-[#5100FF] flex items-center justify-center font-semibold">{initials}</div>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs text-[#585858]">{name ?? "Avocat"}</span>
          {email ? <span className="text-[11px] text-[#999]">{email}</span> : null}
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E9E9E9] rounded-md shadow-sm p-3 z-50">
          <div className="mb-2">
            <div className="text-sm font-semibold text-black">{name ?? "Avocat"}</div>
            {email ? <div className="text-xs text-[#666]">{email}</div> : null}
          </div>
          <div className="pt-2 border-t border-[#F0F0F0]">
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm text-[#FF4C4C] font-semibold hover:underline"
            >
              Déconnexion
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
