"use client";
import React, { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";
import { themeTokens } from "../../theme/system";

const { radii, typography } = themeTokens;

export interface PinInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  readOnly = false,
  error = false,
  autoFocus = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split current value into array of length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputsRef.current[index]?.focus();
      inputsRef.current[index]?.select();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    if (disabled || readOnly) return;
    const inputValue = e.target.value;
    const rawDigit = inputValue.replace(/\D/g, "");
    if (!rawDigit) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      const newValue = nextDigits.join("").trimEnd();
      onChange(newValue);
      return;
    }

    const char = rawDigit.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    const newValue = nextDigits.join("");
    onChange(newValue);

    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }

    if (index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled || readOnly) return;

    if (e.key === "Backspace") {
      if (digits[index]) {
        const nextDigits = [...digits];
        nextDigits[index] = "";
        onChange(nextDigits.join(""));
      } else if (index > 0) {
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        onChange(nextDigits.join(""));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedData) return;

    const pastedDigits = pastedData.slice(0, length);
    onChange(pastedDigits);

    if (pastedDigits.length === length && onComplete) {
      onComplete(pastedDigits);
    }

    const nextFocus = Math.min(pastedDigits.length, length - 1);
    focusInput(nextFocus);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-full">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i]}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus && i === 0}
          aria-label={`Code PIN chiffre ${i + 1}`}
          className={`
            w-10 h-12 sm:w-12 sm:h-14
            text-center text-xl font-semibold
            rounded-md border
            bg-[#f7f6ff] text-[#5100FF]
            transition-all duration-150 ease-in-out
            outline-none
            ${error ? "border-[#FF4C4C] text-[#FF4C4C]" : "border-[#E9E9E9] focus:border-[#5100FF] focus:ring-2 focus:ring-[#5100FF]/20"}
            ${disabled || readOnly ? "bg-[#F7F6FF] cursor-not-allowed opacity-90" : "hover:border-[#CECECE]"}
          `}
          style={{
            borderRadius: radii.md,
            fontWeight: typography.weights.heading,
          }}
        />
      ))}
    </div>
  );
};

export default PinInput;
