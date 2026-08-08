"use client";
import React, { useEffect, useState, useRef } from "react";
import { createPublicApi } from "../../config/api";
import depositSession from "../../lib/deposit-session-storage";
import { PrimaryButton, PinInput, FileRow } from "../ui";
import type { FileRowStatus } from "../ui/FileRow";
import type { PublicDepositedFileDto, UnlockDto, UnlockResponseDto } from "../../src/api/generated/models";
import { Lock, Upload, ShieldCheck, FileCheck, AlertCircle } from "lucide-react";

interface UploadingFileState {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: FileRowStatus;
  fileObj?: File;
}

export default function PublicDepositClient({ token }: { token: string }) {
  const [pin, setPin] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(depositSession.getDepositSessionToken());
  const [files, setFiles] = useState<PublicDepositedFileDto[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const unlock = async (pinValue?: string) => {
    const activePin = pinValue !== undefined ? pinValue : pin;
    if (activePin.length < 6) {
      setUnlockError("Veuillez saisir un code PIN à 6 chiffres");
      return;
    }
    setLoading(true);
    setUnlockError(null);
    try {
      const dto: UnlockDto = { token, pin: activePin };
      const api = createPublicApi();
      const res: UnlockResponseDto = await api.publicControllerUnlock({ unlockDto: dto });
      if (res && res.depositSessionToken) {
        depositSession.setDepositSessionToken(res.depositSessionToken);
        setSessionToken(res.depositSessionToken);
      }
    } catch (err) {
      console.error(err);
      setUnlockError("Code PIN incorrect ou session expirée");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (val: string) => {
    setPin(val);
    if (unlockError) setUnlockError(null);
    if (val.length === 6) {
      unlock(val);
    }
  };

  const uploadSingleFile = async (fileToUpload: File, uploadId: string) => {
    if (!sessionToken) return;

    // Set initial uploading state with progress simulation
    setUploadingFiles((prev) => [
      { id: uploadId, name: fileToUpload.name, size: fileToUpload.size, progress: 20, status: "uploading", fileObj: fileToUpload },
      ...prev,
    ]);

    // Simulate progress ticks for smooth UX
    const interval = setInterval(() => {
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId && item.status === "uploading" && item.progress < 85
            ? { ...item, progress: item.progress + 15 }
            : item
        )
      );
    }, 150);

    try {
      const api = createPublicApi(sessionToken);
      const res = await api.publicControllerUploadFile({ file: fileToUpload as Blob });

      clearInterval(interval);
      // Remove from uploading array, add to completed files
      setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId));
      setFiles((s) => [res, ...s]);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      // Update uploading state to error
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, status: "error", progress: 0 } : item
        )
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    Array.from(selected).forEach((f) => {
      const tempId = `upload-${Date.now()}-${Math.random()}`;
      uploadSingleFile(f, tempId);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRetry = (item: UploadingFileState) => {
    if (item.fileObj) {
      // Remove failed item and re-trigger
      setUploadingFiles((prev) => prev.filter((f) => f.id !== item.id));
      uploadSingleFile(item.fileObj, item.id);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-[#F7F6FF] text-[#5100FF] border border-[#E9E9E9] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-black">Dépôt de pièces sécurisé</h1>
        <p className="text-xs text-[#585858]">Identifiant du dépôt : {token}</p>
      </div>

      {!sessionToken ? (
        /* PIN Unlock Form */
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E9E9E9] space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-[#F7F6FF] text-[#5100FF] flex items-center justify-center mx-auto mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-black">Code d&apos;accès requis</h2>
            <p className="text-xs text-[#585858]">
              Veuillez saisir le code PIN à 6 chiffres transmis par votre avocat.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              unlock();
            }}
            className="space-y-6"
          >
            <PinInput
              length={6}
              value={pin}
              onChange={handlePinChange}
              onComplete={unlock}
              error={!!unlockError}
              autoFocus
            />

            {unlockError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#FF4C4C] font-medium bg-[#FFD0D0]/30 py-2 px-3 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <PrimaryButton type="submit" loading={loading} className="w-full">
              Déverrouiller le dépôt
            </PrimaryButton>
          </form>
        </div>
      ) : (
        /* Deposit Upload & List Area */
        <div className="space-y-6">
          {/* File Upload Zone */}
          <div className="bg-white p-6 rounded-xl border border-[#E9E9E9] space-y-4">
            <h2 className="text-base font-semibold text-black flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#5100FF]" />
              <span>Téléverser des pièces</span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E9E9E9] hover:border-[#5100FF] bg-[#F7F6FF] rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-full bg-white text-[#5100FF] flex items-center justify-center mx-auto mb-3 border border-[#E9E9E9] group-hover:scale-105 transition-transform duration-150">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-black mb-1">
                Cliquez pour choisir vos fichiers
              </p>
              <p className="text-xs text-[#585858]">
                Sélectionnez un ou plusieurs documents (PDF, images, etc.)
              </p>
            </div>
          </div>

          {/* Files Deposited List */}
          <div className="bg-white p-6 rounded-xl border border-[#E9E9E9] space-y-4">
            <h2 className="text-base font-semibold text-black flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#12AC64]" />
              <span>Vos pièces déposées ({files.length})</span>
            </h2>

            {files.length === 0 && uploadingFiles.length === 0 ? (
              <div className="py-8 text-center bg-[#F7F6FF] rounded-lg border border-[#E9E9E9] text-xs text-[#585858]">
                Aucun fichier déposé pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Uploading or Error files */}
                {uploadingFiles.map((uf) => (
                  <FileRow
                    key={uf.id}
                    fileName={uf.name}
                    sizeBytes={uf.size}
                    status={uf.status}
                    progress={uf.progress}
                    onRetry={() => handleRetry(uf)}
                  />
                ))}

                {/* Deposited files */}
                {files.map((f) => (
                  <FileRow
                    key={f.id}
                    fileName={f.originalName}
                    sizeBytes={f.sizeBytes}
                    uploadedAt={f.uploadedAt}
                    status="done"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
