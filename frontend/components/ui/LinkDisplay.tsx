"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Copy, Check } from "lucide-react";
import { themeTokens } from "../../theme/system";

const { radii, typography } = themeTokens;

export interface LinkDisplayProps {
  url: string;
  expiresAt: Date | string;
  pinDigits?: number;
}

export const LinkDisplay: React.FC<LinkDisplayProps> = ({
  url,
  expiresAt,
  pinDigits = 6,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = format(new Date(expiresAt), "dd/MM/yyyy", { locale: fr });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Erreur lors de la copie :", err);
    }
  };

  // Format clean displayed URL (remove http:// or https:// for clean presentation if desired, or keep as is)
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="bg-[#F7F6FF] border border-[#E9E9E9] rounded-xl p-4 sm:p-5" style={{ borderRadius: radii.lg }}>
      {/* Top box: Link display + Copier button */}
      <div className="bg-white border border-[#E9E9E9] rounded-lg p-3 flex items-center justify-between gap-3 mb-2.5" style={{ borderRadius: radii.md }}>
        <span
          className="text-xs sm:text-sm text-black truncate flex-1 font-mono tracking-tight"
          style={{
            fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
          title={url}
        >
          {displayUrl}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="text-[#5100FF] font-semibold text-xs sm:text-sm hover:underline inline-flex items-center gap-1.5 shrink-0 cursor-pointer bg-transparent border-0 p-0 transition-colors duration-150"
          style={{ fontWeight: typography.weights.heading }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#12AC64]" />
              <span className="text-[#12AC64]">Copié</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#5100FF]" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Helper text below */}
      <p className="text-xs text-[#585858] leading-relaxed">
        Expire le {formattedDate}, protégé par un code à {pinDigits} chiffres
      </p>
    </div>
  );
};

export default LinkDisplay;
