"use client";
import React from "react";
import { Button } from "@chakra-ui/react";
import type { ButtonProps } from "@chakra-ui/react";
import { primaryButtonVariant } from "../../theme/system";

export type PrimaryButtonProps = ButtonProps & { loading?: boolean };

/**
 * PrimaryButton: uses design tokens from theme/system.ts
 * Variant "primary" per spec: inverted hover, inset border, full radius
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = (props) => {
  const { loading, ...rest } = props;
  const resolvedLoading = typeof loading !== "undefined" ? loading : false;
  return (
    <Button
      {...primaryButtonVariant}
      {...(rest as ButtonProps)}
      loading={resolvedLoading}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      gap="8px"
    />
  );
};

export default PrimaryButton;