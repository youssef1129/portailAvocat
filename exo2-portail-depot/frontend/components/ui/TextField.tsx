"use client";
import React from "react";
import { Field, Input } from "@chakra-ui/react";
import type { InputProps } from "@chakra-ui/react";
import { themeTokens } from "../../theme/system";

const { colors, radii, typography } = themeTokens;

export interface TextFieldProps extends InputProps {
  label?: string;
  error?: string | null;
}

export const TextField: React.FC<TextFieldProps> = ({ label, error, id, ...rest }) => {
  const inputId = id || undefined;
  return (
    <Field.Root invalid={!!error} width="100%">
      {label ? (
        <Field.Label htmlFor={inputId} fontWeight={typography.weights.heading} mb="6px" fontSize="sm" color={colors.text}>
          {label}
        </Field.Label>
      ) : null}
      <Input
        id={inputId}
        {...rest}
        bg={colors.white}
        borderColor={colors.border}
        borderRadius={radii.md}
        px="14px"
        height="44px"
        fontSize="sm"
        transition="all 150ms ease-in-out"
        _hover={{ borderColor: colors.grayLight }}
        _focus={{ boxShadow: `0 0 0 3px rgba(81, 0, 255, 0.18)`, borderColor: colors.primary, outline: "none" }}
      />
      {error ? <Field.ErrorText color={colors.danger} fontSize="xs" mt="4px">{error}</Field.ErrorText> : null}
    </Field.Root>
  );
};

export default TextField;