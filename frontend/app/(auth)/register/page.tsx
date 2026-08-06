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
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Créer un compte avocat</h1>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PrimaryButton type="submit" loading={loading}>Créer le compte</PrimaryButton>
      </form>
    </div>
  );
}
