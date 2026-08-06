"use client";
import React, { useState } from "react";
import { PrimaryButton } from "../../../components/ui";
import depositSession from "../../../lib/deposit-session-storage";
import { useRouter } from "next/navigation";

export default function DepositUnlockPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [unlocked, setUnlocked] = useState(false);
  const router = useRouter();

  const unlock = async () => {
    // dev placeholder: accept any token
    depositSession.setDepositSessionToken(token);
    setUnlocked(true);
    // navigate to a simple upload UI later
    router.refresh();
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-4">Dépôt public</h1>
      <p className="mb-6 text-gray-600">Token: {token}</p>
      {!unlocked ? (
        <PrimaryButton onClick={unlock}>Déverrouiller</PrimaryButton>
      ) : (
        <div className="mt-4">Session déverrouillée — upload UI à venir.</div>
      )}
    </div>
  );
}
