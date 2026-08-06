"use client";
import React, { useEffect, useState } from "react";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import RequestCard from "./RequestCard";
import type { DepositRequestResponseDto } from "../../src/api/generated/models";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { PrimaryButton } from "../ui";

export default function RequestsListClient() {
  const [requests, setRequests] = useState<DepositRequestResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = authStorage.getAuthToken() || undefined;
        const api = createRequestsApi(token);
        const res = await api.requestsControllerFindAll();
        if (mounted) setRequests(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#E9E9E9] rounded-xl p-6 h-[160px] animate-pulse flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-5 bg-[#F7F6FF] rounded w-3/4" />
              <div className="h-3 bg-[#F7F6FF] rounded w-1/2" />
            </div>
            <div className="h-4 bg-[#F7F6FF] rounded w-full pt-4 border-t border-[#E9E9E9]" />
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-xl border border-[#E9E9E9] text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F7F6FF] text-[#5100FF] border border-[#E9E9E9] flex items-center justify-center">
          <FolderOpen className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-black">Aucune demande trouvée</h3>
          <p className="text-sm text-[#585858]">Créez votre première demande de dépôt de pièces pour votre client.</p>
        </div>
        <div className="pt-2">
          <Link href="/dashboard/requests/new">
            <PrimaryButton>
              <Plus className="w-4 h-4" />
              <span>Nouvelle demande</span>
            </PrimaryButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {requests.map((r) => (
        <RequestCard key={r.id} request={r} />
      ))}
    </div>
  );
}
