"use client";
import React from "react";
import { Button } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import { primaryButtonVariant, outlineButtonVariant, buttonSizes } from "../../theme/system";

export type PrimaryButtonProps = ButtonProps & {
  loading?: boolean;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: primaryButtonVariant,
  outline: outlineButtonVariant,
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  loading = false,
  variant = "primary",
  size = "md",
  ...rest
}) => {
  return (
    <Button
      {...variants[variant]}
      {...buttonSizes[size]}
      {...(rest as ButtonProps)}
      loading={loading}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      gap="8px"
    />
  );
};

export default PrimaryButton;