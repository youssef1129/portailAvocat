"use client";
import React, { useState } from "react";
import Link from "next/link";
import { format, differenceInCalendarDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import StatusBadge from "../ui/StatusBadge";
import type { DepositRequestResponseDto } from "../../src/api/generated/models";
import { themeTokens } from "../../theme/system";
import { Copy, Check, Calendar, Files } from "lucide-react";

const { radii, typography } = themeTokens;

export interface RequestCardProps {
  request: DepositRequestResponseDto;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const [copied, setCopied] = useState(false);

  const createdAtDate = new Date(request.createdAt);
  const expiresAtDate = new Date(request.expiresAt);
  const now = new Date();

  const formattedCreatedDate = format(createdAtDate, "dd/MM/yyyy", { locale: fr });
  const isExpired = isBefore(expiresAtDate, now) || request.status === "expiree";
  const daysLeft = differenceInCalendarDays(expiresAtDate, now);

  let metaExpirationText = "";
  if (isExpired) {
    metaExpirationText = "expirée";
  } else if (daysLeft === 0) {
    metaExpirationText = "expire aujourd'hui";
  } else if (daysLeft === 1) {
    metaExpirationText = "expire dans 1 jour";
  } else {
    metaExpirationText = `expire dans ${daysLeft} jours`;
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const publicUrl = `${window.location.origin}/d/${request.publicToken}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Erreur de copie :", err);
    }
  };

  return (
    <div
      className="bg-white border border-[#E9E9E9] rounded-xl p-6 flex flex-col justify-between transition-all duration-200 ease-in-out hover:border-[#5100FF]/50"
      style={{ borderRadius: radii.lg }}
    >
      <div className="space-y-3">
        {/* Top line: Title (left) & StatusBadge (right) */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/dashboard/requests/${request.id}`}
            className="group flex-1 min-w-0"
          >
            <h3
              className="text-base font-semibold text-black group-hover:text-[#5100FF] transition-colors duration-150 truncate leading-snug"
              style={{ fontWeight: typography.weights.heading }}
            >
              {request.title}
            </h3>
          </Link>
          <StatusBadge kind={request.status} />
        </div>

        {/* Meta line */}
        <div className="flex items-center gap-1.5 text-xs text-[#585858]">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-[#585858]" />
          <span>
            Créée le {formattedCreatedDate}, {metaExpirationText}
          </span>
        </div>
      </div>

      {/* Bottom row: File count (left) & Copy link text action (right) */}
      <div className="pt-4 mt-5 border-t border-[#E9E9E9] flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 text-black">
          <Files className="w-3.5 h-3.5 text-[#585858]" />
          <span className="font-normal text-xs sm:text-sm">
            {request.filesCount} {request.filesCount > 1 ? "pièces" : "pièce"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="text-[#5100FF] font-semibold hover:underline inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer bg-transparent border-0 p-0 text-xs sm:text-sm"
          style={{ fontWeight: typography.weights.heading }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#12AC64]" />
              <span className="text-[#12AC64]">Lien copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#5100FF]" />
              <span>Copier le lien</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RequestCard;
