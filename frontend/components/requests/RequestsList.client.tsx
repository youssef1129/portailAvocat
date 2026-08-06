"use client";
import React, { useEffect, useState } from "react";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import { PrimaryButton, StatusBadge } from "../ui";
import Link from "next/link";
import type { DepositRequestResponseDto } from "../../src/api/generated/models";
import { format } from "date-fns";

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

  if (loading) return <div>Chargement...</div>;
  if (requests.length === 0) return <div className="bg-white p-6 rounded-md border border-[#E9E9E9]">Aucune demande trouvée.</div>;

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <div key={r.id} className="bg-white p-4 rounded-md border border-[#E9E9E9] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="font-medium">{r.title}</h2>
              <StatusBadge kind={r.status}>{r.status}</StatusBadge>
            </div>
            <div className="text-sm text-gray-500">Fichiers: {r.filesCount} • Créée {format(new Date(r.createdAt), "yyyy-MM-dd HH:mm")}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/requests/${r.id}`} className="text-sm text-primary">Voir</Link>
            <a href={`/d/${r.publicToken}`} className="text-sm text-gray-600" target="_blank" rel="noreferrer">Ouvrir dépôt</a>
          </div>
        </div>
      ))}
    </div>
  );
}
