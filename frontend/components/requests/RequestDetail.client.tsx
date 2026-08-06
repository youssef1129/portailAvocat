"use client";
import React, { useEffect, useState } from "react";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import { PrimaryButton, StatusBadge } from "../ui";
import type { DepositRequestDetailDto, DepositedFileDto } from "../../src/api/generated/models";
import { format } from "date-fns";

export default function RequestDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<DepositRequestDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = authStorage.getAuthToken() || undefined;
        const api = createRequestsApi(token);
        const res = await api.requestsControllerFindOne({ id });
        if (mounted) setDetail(res);
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
  }, [id]);

  const previewFile = async (fileId: string) => {
    try {
      const token = authStorage.getAuthToken() || undefined;
      const api = createRequestsApi(token);
      const res = await api.requestsControllerPreviewFile({ id, fileId });
      if (res?.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else alert("Aucune URL de prévisualisation disponible");
    } catch (err) {
      console.error(err);
      alert("Impossible de récupérer l'aperçu");
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;
  if (!detail) return <div className="p-8">Détails non disponibles.</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{detail.title}</h1>
          <div className="text-sm text-gray-500">Créée {format(new Date(detail.createdAt), 'Pp')}</div>
        </div>
        <StatusBadge kind={detail.status}>{detail.status}</StatusBadge>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <h2 className="font-medium mb-2">Fichiers déposés ({detail.filesCount})</h2>
        {detail.files.length === 0 ? (
          <div className="text-gray-500">Aucun fichier</div>
        ) : (
          <ul className="space-y-2">
            {detail.files.map((f: DepositedFileDto) => (
              <li key={f.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.originalName}</div>
                  <div className="text-sm text-gray-500">{Math.round(f.sizeBytes / 1024)} KB • {format(new Date(f.uploadedAt), 'Pp')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <PrimaryButton onClick={() => previewFile(f.id)}>Aperçu</PrimaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
