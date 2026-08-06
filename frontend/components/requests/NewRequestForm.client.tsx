"use client";
import React, { useState } from "react";
import { PrimaryButton, TextField, PinInput, LinkDisplay } from "../ui";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import type { CreateDepositRequestDto, CreateDepositRequestResponseDto } from "../../src/api/generated/models";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function NewRequestForm() {
  const [title, setTitle] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [created, setCreated] = useState<CreateDepositRequestResponseDto | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Veuillez saisir un titre.");
    setLoading(true);
    try {
      const dto: CreateDepositRequestDto = { title, expiresAt };
      const token = authStorage.getAuthToken() || undefined;
      const api = createRequestsApi(token);
      const res = await api.requestsControllerCreate({ createDepositRequestDto: dto });
      setCreated(res);
    //   setTimeout(() => router.push(`/dashboard/requests/${res.id}`), 3500);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Impossible de créer la demande");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/d/${created.publicToken}`;

    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E9E9E9] text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-[#D9FFED] text-[#12AC64] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-black mb-1">Demande de dépôt créée !</h2>
            <p className="text-xs text-[#585858]">Titre : &quot;{created.title}&quot;</p>
          </div>

          {/* PIN box */}
          <div className="border border-[#E9E9E9] rounded-xl space-y-3">
            <div className="flex bg-[#F7F6FF] items-center p-5 justify-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Code PIN de sécurité (à transmettre à votre client)</span>
            </div>
            <PinInput value={created.pin || ""} onChange={() => {}} readOnly length={6} />
            <p className="text-[11px] text-[#FF4C4C] font-medium">
              Note : Ce code PIN ne sera plus réaffiché par la suite.
            </p>
          </div>

          {/* Link display */}
          <div className="text-left">
            <p className="text-xs font-semibold text-black uppercase tracking-wider mb-2">Lien généré</p>
            <LinkDisplay url={publicUrl} expiresAt={created.expiresAt} pinDigits={6} />
          </div>

          {/* <p className="text-xs text-[#585858] animate-pulse">
            Redirection automatique vers la demande dans quelques secondes...
          </p> */}

          <div>
            <Link href={`/dashboard/requests/${created.id}`}>
              <PrimaryButton>Accéder directement</PrimaryButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#585858] hover:text-[#5100FF] inline-flex items-center gap-1.5 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au tableau de bord</span>
        </Link>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E9E9E9] space-y-6">
        <div>
          <p className="text-xs font-semibold text-[#5100FF] uppercase tracking-wider mb-1">Nouveau dossier</p>
          <h2 className="text-2xl font-semibold text-black">Créer une demande de dépôt</h2>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <TextField
            label="Titre de la demande"
            placeholder="ex: Pièces justificatives - Client Dupont"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-black">Date d&apos;expiration (optionnel)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-[#E9E9E9] rounded-md px-3.5 py-2.5 text-sm bg-white text-black focus:outline-none focus:border-[#5100FF] focus:ring-2 focus:ring-[#5100FF]/20 transition-all duration-150"
            />
          </div>

          <div className="pt-2">
            <PrimaryButton type="submit" loading={loading} className="w-full">
              Créer la demande
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
