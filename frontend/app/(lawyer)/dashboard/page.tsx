import React from "react";
import RequestsListClient from "../../../components/requests/RequestsList.client";
import { PrimaryButton } from "../../../components/ui";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Link href="/dashboard/requests/new">
          <PrimaryButton>Nouvelle demande</PrimaryButton>
        </Link>
      </div>

      <RequestsListClient />
    </div>
  );
}
