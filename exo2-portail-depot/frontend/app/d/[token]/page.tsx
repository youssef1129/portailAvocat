import React from "react";
import PublicDepositClient from "../../../components/public/PublicDeposit.client";

export default async function DepositUnlockPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicDepositClient token={token} />;
}
