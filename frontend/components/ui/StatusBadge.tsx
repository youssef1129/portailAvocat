"use client";
import React from "react";
import { Badge } from "@chakra-ui/react";
import type { BadgeProps } from "@chakra-ui/react";
import { themeTokens } from "../../theme/system";

const { colors, radii, typography } = themeTokens;

export type StatusKind = "en_attente" | "complete" | "expiree" | "warning";

const kindStyles: Record<StatusKind, Partial<BadgeProps>> = {
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

export interface StatusBadgeProps extends BadgeProps {
    kind?: StatusKind;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ kind = "en_attente", children, ...rest }) => {
    const style = kindStyles[kind] || kindStyles.en_attente;
    return (
        <Badge
            {...(style)}
            {...rest}
            fontWeight={typography.weights.heading}
            borderRadius={radii.full}
            px="10px"
            py="6px"
            display="inline-flex"
            alignItems="center"
        >
            {children}
        </Badge>
    );
};

export default StatusBadge;
