"use client";
import React from "react";
import { Badge } from "@chakra-ui/react";
import type { BadgeProps } from "@chakra-ui/react";
import { themeTokens } from "../../theme/system";

const { colors, radii, typography } = themeTokens;

export type StatusKind = "other" | "en_attente" | "complete" | "expiree" | "warning" | string;

const kindStyles: Record<string, Partial<BadgeProps>> = {
    other: {
        bg: colors.accentBg,
        color: colors.primary,
    },
    en_attente: {
        bg: colors.warningBg,
        color: colors.warning,
    },
    complete: {
        bg: colors.successBg,
        color: colors.success,
    },
    expiree: {
        bg: colors.dangerBg,
        color: colors.danger,
    },
    warning: {
        bg: colors.infoBg,
        color: colors.info,
    },
};

const statusLabels: Record<string, string> = {
    en_attente: "En attente",
    complete: "Complétée",
    expiree: "Expirée",
};

export interface StatusBadgeProps extends BadgeProps {
    kind?: StatusKind;
    customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ kind = "other", children, customLabel, ...rest }) => {
    const style = kindStyles[kind] || kindStyles.en_attente;
    const label = children || customLabel || statusLabels[kind] || kind;

    return (
        <Badge
            {...style}
            {...rest}
            fontWeight={typography.weights.heading}
            borderRadius={radii.full}
            px="10px"
            py="4px"
            fontSize="xs"
            display="inline-flex"
            alignItems="center"
        >
            {label}
        </Badge>
    );
};

export default StatusBadge;
