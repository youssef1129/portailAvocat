import React from "react";
import RequestsListClient from "../../../components/requests/RequestsList.client";
import { PrimaryButton } from "../../../components/ui";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[24px] border border-[#E9E9E9] bg-white p-6">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.18em] mb-2">Tableau de bord avocat</p>
          <h1 className="text-3xl font-semibold text-black">Bienvenue sur votre espace</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/requests/new" className="inline-flex">
            <PrimaryButton>Nouvelle demande</PrimaryButton>
          </Link>
          <button
            type="button"
            className="rounded-full border border-[#E9E9E9] px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-[#F7F6FF]"
          >
            Profil
          </button>
          <button
            type="button"
            className="rounded-full border border-[#E9E9E9] px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-[#F7F6FF]"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E9E9E9] bg-white p-6">
        <RequestsListClient />
      </div>
    </div>
  );
}
