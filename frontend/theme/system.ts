// theme/system.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// --- tes tokens existants, inchangés ---
export const colors = {
  primary: "#5100FF",
  secondary: "#916ED8",
  text: "#000000",
  gray: "#585858",
  grayLight: "#CECECE",
  border: "#E9E9E9",
  accentBg: "#F7F6FF",
  accentSoft: "#DBCDFF",
  success: "#12AC64",
  successBg: "#D9FFED",
  danger: "#FF4C4C",
  dangerBg: "#FFD0D0",
  warning: "#DA9705",
  warningBg: "#FFEDCA",
  info: "#52A0EE",
  infoBg: "#DBEDFF",
  white: "#FFFFFF",
};

export const typography = {
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  weights: { body: 400, heading: 600 },
};

export const radii = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "999px",
};

export const shadows = {
  insetPrimary: (primary = colors.primary) => `inset 0 0 0 1px ${primary}`,
};

export const primaryButtonVariant = {
  bg: colors.primary,
  color: colors.white,
  fontWeight: typography.weights.heading,
  px: "24px",
  py: "14px",
  borderRadius: radii.full,
  transition: "all 160ms cubic-bezier(0.22,1,0.36,1)",
  _hover: {
    bg: colors.accentBg,
    color: colors.primary,
    boxShadow: shadows.insetPrimary(),
  },
  _active: { transform: "translateY(0)" },
};

export const themeTokens = { colors, typography, radii, shadows };

// --- config Chakra v3 réelle, indispensable pour ChakraProvider ---
const config = defineConfig({
  preflight: false,
  globalCss: {
    "html, body": {
      minHeight: "100%",
      background: colors.white,
      color: colors.text,
    },
    body: {
      margin: 0,
      fontFamily: typography.fontFamily,
      background: colors.white,
      color: colors.text,
    },
    "*": {
      boxSizing: "border-box",
    },
  },
  theme: {
    tokens: {
      colors: {
        primary: { value: colors.primary },
        secondary: { value: colors.secondary },
        border: { value: colors.border },
        accentBg: { value: colors.accentBg },
        accentSoft: { value: colors.accentSoft },
        success: { value: colors.success },
        successBg: { value: colors.successBg },
        danger: { value: colors.danger },
        dangerBg: { value: colors.dangerBg },
        warning: { value: colors.warning },
        warningBg: { value: colors.warningBg },
        info: { value: colors.info },
        infoBg: { value: colors.infoBg },
        white: { value: colors.white },
        text: { value: colors.text },
      },
      radii: {
        sm: { value: radii.sm },
        md: { value: radii.md },
        lg: { value: radii.lg },
        full: { value: radii.full },
      },
      fonts: {
        body: { value: typography.fontFamily },
        heading: { value: typography.fontFamily },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config, { preflight: false });

export default themeTokens;
