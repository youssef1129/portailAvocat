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
        <Field.Root invalid={!!error}>
            {label ? (
                <Field.Label htmlFor={inputId} fontWeight={typography.weights.heading} mb="8px">
                    {label}
                </Field.Label>
            ) : null}
            <Input
                id={inputId}
                {...rest}
                bg={colors.white}
                borderColor={colors.border}
                borderRadius={radii.md}
                _focus={{ boxShadow: `0 0 0 3px ${colors.accentSoft}`, borderColor: colors.primary }}
            />
            {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
        </Field.Root>
    );
};

export default TextField;