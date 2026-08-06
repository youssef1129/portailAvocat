"use client";
import React from "react";
import { Check, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { themeTokens } from "../../theme/system";

const { radii, typography } = themeTokens;

export type FileRowStatus = "done" | "uploading" | "error";

export interface FileRowProps {
  fileName: string;
  sizeBytes: number;
  uploadedAt?: Date | string;
  status?: FileRowStatus;
  progress?: number; // 0..100
  onRetry?: () => void;
  onPreview?: () => void;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 Ko";
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace(".", ",");
    return `${kb} Ko`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  return `${mb} Mo`;
}

export const FileRow: React.FC<FileRowProps> = ({
  fileName,
  sizeBytes,
  status = "done",
  progress = 0,
  onRetry,
  onPreview,
}) => {
  const extension = (fileName.split(".").pop() || "FILE").toUpperCase().slice(0, 4);

  return (
    <div
      className="bg-white border border-[#E9E9E9] rounded-lg p-3 sm:px-4 flex items-center justify-between gap-3 transition-all duration-150 ease-in-out hover:border-[#5100FF]/30"
      style={{ borderRadius: radii.md }}
    >
      {/* Left: Extension Badge + Filename & Size */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-10 h-10 rounded-md bg-[#F7F6FF] border border-[#E9E9E9] text-[#5100FF] font-semibold text-xs flex items-center justify-center shrink-0 uppercase tracking-wider"
          style={{ borderRadius: radii.md, fontWeight: typography.weights.heading }}
        >
          {extension}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-[#000000] truncate"
            title={fileName}
            style={{ fontWeight: typography.weights.heading }}
          >
            {fileName}
          </p>
          <p className="text-xs text-[#585858]">
            {formatFileSize(sizeBytes)}
          </p>
        </div>
      </div>

      {/* Right: Status Indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {status === "done" && (
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="text-xs text-[#5100FF] font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu</span>
              </button>
            )}
            <div className="w-7 h-7 rounded-full bg-[#D9FFED] flex items-center justify-center text-[#12AC64]">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        )}

        {status === "uploading" && (
          <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[140px]">
            <div className="flex-1 bg-[#E9E9E9] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#5100FF] h-full transition-all duration-200 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#5100FF] w-8 text-right">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[#FF4C4C] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs text-[#FF4C4C] font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Réessayer</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileRow;
