"use client";
import React, { useState } from "react";
import { TextField, PrimaryButton } from "../../../components/ui";
import { createAuthApi } from "../../../config/api";
import authStorage from "../../../lib/auth-storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);
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
      setError(msg || "Échec de l'inscription. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-[#E9E9E9] rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F6FF] text-[#5100FF] border border-[#E9E9E9] flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5100FF] mb-1">Espace avocat</p>
            <h1 className="text-2xl font-semibold text-black">Créer un compte</h1>
            <p className="text-sm text-[#585858] mt-2">Inscrivez-vous pour créer et administrer vos demandes de dépôt sécurisées.</p>
          </div>
        </div>

        {error && (
          <div className="bg-[#FFD0D0]/40 border border-[#FF4C4C]/30 text-[#FF4C4C] text-xs p-3 rounded-xl font-medium mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <TextField
            label="Nom complet"
            placeholder="Me Jean Dupont"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            label="Adresse email"
            type="email"
            placeholder="avocat@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <PrimaryButton type="submit" loading={loading} className="w-full">
            Créer le compte
          </PrimaryButton>
        </form>

        <div className="mt-6 border-t border-[#E9E9E9] pt-4 text-center text-sm text-[#585858]">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-[#5100FF] font-semibold hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
