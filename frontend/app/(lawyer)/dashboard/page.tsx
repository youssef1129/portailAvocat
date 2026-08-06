"use client";
import React from "react";
import RequestsListClient from "../../../components/requests/RequestsList.client";
import { PrimaryButton } from "../../../components/ui";
import Link from "next/link";
import authStorage from "../../../lib/auth-storage";
import { useRouter } from "next/navigation";
import { Plus, LogOut, FolderKanban } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    authStorage.clearAuthToken();
    router.push("/login");
  };

  return (
    <div className="space-y-8">
      {/* Header section card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-xl border border-[#E9E9E9] bg-white p-6 sm:p-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5100FF] uppercase tracking-wider">
              <FolderKanban className="w-3.5 h-3.5" />
              Espace Avocat
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-black">Tableau de bord</h1>
          <p className="text-sm text-[#585858]">
            Gérez vos demandes actives et suivez l&apos;avancement du dépôt de pièces de vos clients.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard/requests/new">
            <PrimaryButton>
              <Plus className="w-4 h-4" />
              <span>Nouvelle demande</span>
            </PrimaryButton>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-[#E9E9E9] px-4 py-2.5 text-xs font-semibold text-[#585858] hover:text-black hover:bg-[#F7F6FF] transition-all duration-150 flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-black">Vos demandes de dépôt</h2>
        </div>

        <RequestsListClient />
      </div>
    </div>
  );
}
