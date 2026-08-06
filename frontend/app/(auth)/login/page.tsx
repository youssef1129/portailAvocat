"use client";
import React, { useState } from "react";
import { TextField, PrimaryButton } from "../../../components/ui";
import authStorage from "../../../lib/auth-storage";
import { createAuthApi } from "../../../config/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const api = createAuthApi();
      const res = await api.authControllerLogin({ loginDto: { email, password } });
      if (res && res.accessToken) {
        authStorage.setAuthToken(res.accessToken);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-112px)] flex items-center justify-center">
      <div className="w-full max-w-md rounded-[28px] border border-[#E9E9E9] bg-white p-10 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.18em] mb-3">Espace avocat</p>
          <h1 className="text-3xl font-semibold text-black">Connexion</h1>
          <p className="mt-2 text-sm text-gray-600">Connectez-vous pour accéder à vos demandes et dépôts sécurisés.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PrimaryButton type="submit" loading={loading} className="w-full">Se connecter</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
