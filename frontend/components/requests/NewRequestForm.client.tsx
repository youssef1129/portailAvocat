"use client";
import React, { useState } from "react";
import { PrimaryButton, TextField } from "../ui";
import { createRequestsApi } from "../../config/api";
import authStorage from "../../lib/auth-storage";
import type { CreateDepositRequestDto, CreateDepositRequestResponseDto } from "../../src/api/generated/models";
import { useRouter } from "next/navigation";

export default function NewRequestForm() {
  const [title, setTitle] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [created, setCreated] = useState<CreateDepositRequestResponseDto | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dto: CreateDepositRequestDto = { title, expiresAt };
      const token = authStorage.getAuthToken() || undefined;
      const api = createRequestsApi(token);
      const res = await api.requestsControllerCreate({ createDepositRequestDto: dto });
      setCreated(res);
      // navigate to the detail page after showing the PIN briefly
      setTimeout(() => router.push(`/dashboard/requests/${res.id}`), 2500);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Impossible de créer la demande");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-md mx-auto py-8">
        <h2 className="text-xl font-semibold mb-4">Demande créée</h2>
        <div className="bg-white p-4 rounded-md border border-[#E9E9E9]">
          <div className="mb-2">Titre: {created.title}</div>
          <div className="mb-2">Public token: {created.publicToken}</div>
          <div className="mb-2">PIN (affiché une seule fois): <strong>{created.pin}</strong></div>
          <div className="text-sm text-gray-500 mt-2">Redirection vers la page de la demande...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h2 className="text-xl font-semibold mb-4">Nouvelle demande de dépôt</h2>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <label className="block text-sm font-medium mb-2">Date d&apos;expiration</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full border p-2 rounded-md"
          />
        </div>
        <PrimaryButton type="submit" loading={loading}>Créer</PrimaryButton>
      </form>
    </div>
  );
}
