"use client";
import React from "react";
import { Button } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import { primaryButtonVariant, outlineButtonVariant, buttonSizes } from "../../theme/system";

export type PrimaryButtonProps = Omit<ButtonProps, "size" | "variant"> & {
  loading?: boolean;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: primaryButtonVariant,
  outline: outlineButtonVariant,
} as const;

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  loading = false,
  variant = "primary",
  size = "md",
  ...rest
}) => {
  const variantStyles = variants[variant];
  const sizeStyles = buttonSizes[size];

  return (
    <Button
      {...variantStyles}
      {...sizeStyles}
      {...rest}
      loading={loading}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      gap="8px"
    />
  );
};

export default PrimaryButton;