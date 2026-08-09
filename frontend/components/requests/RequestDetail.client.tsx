"use client";
import React, { useEffect, useState } from "react";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import { StatusBadge, FileRow, LinkDisplay, PrimaryButton } from "../ui";
import type { DepositRequestDetailDto, DepositedFileDto } from "../../src/api/generated/models";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function RequestDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<DepositRequestDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

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

  if (loading) {
    return (
      <div className="max-w-[80%] mx-auto space-y-6">
        <div className="min-h-[80px] bg-[#F7F6FF] rounded min-w-[80px] animate-pulse" />
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#E9E9E9] space-y-4 animate-pulse">
          <div className="min-h-20 bg-[#F7F6FF] rounded w-2/3" />
          <div className="min-h-20 bg-[#F7F6FF] rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-[#E9E9E9] text-center space-y-4">
        <p className="text-black font-medium">Détails non disponibles.</p>
        <Link href="/dashboard" className="text-xs text-[#5100FF] font-semibold hover:underline inline-flex items-center gap-1">
          <PrimaryButton variant={'outline'}>
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au tableau de bord</span>
          </PrimaryButton>
        </Link>
      </div>
    );
  }

  const publicUrl = `${origin}/d/${detail.publicToken}`;
  const formattedCreatedDate = format(new Date(detail.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#585858] hover:text-[#5100FF] inline-flex items-center gap-1.5 transition-colors duration-150"
        >
          <PrimaryButton variant={'outline'}>
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux demandes</span>
          </PrimaryButton>
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#E9E9E9] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-black mb-1">{detail.title}</h1>
            <p className="text-xs text-[#585858]">Créée le {formattedCreatedDate}</p>
          </div>
          <div className="self-start sm:self-auto">
            <StatusBadge kind={detail.status} />
          </div>
        </div>

        {/* Public Link Display section */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-black uppercase tracking-wider mb-2">Lien de dépôt sécurisé</p>
          <LinkDisplay url={publicUrl} expiresAt={detail.expiresAt} pinDigits={6} />
        </div>
      </div>

      {/* Files list section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-[#E9E9E9] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-black flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#5100FF]" />
            <span>Fichiers déposés ({detail.filesCount})</span>
          </h2>
        </div>

        {detail.files.length === 0 ? (
          <div className="py-8 text-center bg-[#F7F6FF] rounded-lg border border-[#E9E9E9] text-xs text-[#585858]">
            Aucun fichier n&apos;a encore été déposé pour cette demande.
          </div>
        ) : (
          <div className="space-y-3">
            {detail.files.map((f: DepositedFileDto) => (
              <FileRow
                key={f.id}
                fileName={f.originalName}
                sizeBytes={f.sizeBytes}
                uploadedAt={f.uploadedAt}
                status="done"
                onPreview={() => previewFile(f.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
