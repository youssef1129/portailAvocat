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
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Connexion avocat</h1>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PrimaryButton type="submit" loading={loading}>Se connecter</PrimaryButton>
      </form>
    </div>
  );
}
