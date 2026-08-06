"use client";
import React, { useState } from "react";
import { TextField, PrimaryButton } from "../../../components/ui";
import { createAuthApi } from "../../../config/api";
import authStorage from "../../../lib/auth-storage";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const api = createAuthApi();
      const res = await api.authControllerRegister({ registerDto: { email, password, name: fullName } });
      if (res && res.accessToken) {
        authStorage.setAuthToken(res.accessToken);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-112px)] flex items-center justify-center">
      <div className="w-full max-w-md rounded-[28px] border border-[#E9E9E9] bg-white p-10 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.18em] mb-3">Espace avocat</p>
          <h1 className="text-3xl font-semibold text-black">Créer un compte</h1>
          <p className="mt-2 text-sm text-gray-600">Inscrivez-vous pour gérer vos dépôts et demandes en toute sécurité.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <TextField label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PrimaryButton type="submit" loading={loading} className="w-full">Créer le compte</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
