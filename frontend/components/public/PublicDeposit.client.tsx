"use client";
import React, { useEffect, useState } from "react";
import { createPublicApi } from "../../config/api";
import depositSession from "../../lib/deposit-session-storage";
import { TextField, PrimaryButton } from "../ui";
import type { PublicDepositedFileDto, UnlockDto, UnlockResponseDto } from "../../src/api/generated/models";

export default function PublicDepositClient({ token }: { token: string }) {
  const [pin, setPin] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(depositSession.getDepositSessionToken());
  const [files, setFiles] = useState<PublicDepositedFileDto[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsub = depositSession.subscribeToDepositSession((t) => setSessionToken(t));
    return unsub;
  }, []);

  useEffect(() => {
    if (!sessionToken) return;
    const loadFiles = async () => {
      try {
        const api = createPublicApi(sessionToken);
        const res = await api.publicControllerListFiles();
        setFiles(res || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadFiles();
  }, [sessionToken]);

  const unlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const dto: UnlockDto = { token, pin };
      const api = createPublicApi();
      const res: UnlockResponseDto = await api.publicControllerUnlock({ unlockDto: dto });
      if (res && res.depositSessionToken) {
        depositSession.setDepositSessionToken(res.depositSessionToken);
        setSessionToken(res.depositSessionToken);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Impossible de déverrouiller le dépôt");
    } finally {
      setLoading(false);
    }
  };

  const upload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return alert("Sélectionnez un fichier");
    if (!sessionToken) return alert("Session non déverrouillée");
    setLoading(true);
    try {
      const api = createPublicApi(sessionToken);
      const res = await api.publicControllerUploadFile({ file: selectedFile as Blob });
      setFiles((s) => [res, ...s]);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Erreur upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-4">Dépôt public</h1>
      <p className="mb-6 text-gray-600">Token: {token}</p>

      {!sessionToken ? (
        <form onSubmit={unlock} className="space-y-4">
          <TextField label="Code PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <PrimaryButton type="submit" loading={loading}>Déverrouiller</PrimaryButton>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-md border border-[#E9E9E9]">
            <label className="block text-sm font-medium mb-2">Ajouter un fichier</label>
            <input type="file" onChange={(ev) => setSelectedFile(ev.target.files ? ev.target.files[0] : null)} />
            <div className="mt-4">
              <PrimaryButton onClick={upload} loading={loading}>Téléverser</PrimaryButton>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-[#E9E9E9]">
            <h2 className="font-medium mb-2">Fichiers déposés ({files.length})</h2>
            {files.length === 0 ? (
              <div className="text-gray-500">Aucun fichier</div>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.originalName}</div>
                      <div className="text-sm text-gray-500">{Math.round(f.sizeBytes / 1024)} KB • {new Date(f.uploadedAt).toISOString().slice(0, 16).replace('T', ' ')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
