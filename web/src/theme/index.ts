import { createTheme } from "@mui/material/styles";
import { components } from "./components";
import type { AppIdentity } from "./types";
export function createAppTheme(identity: AppIdentity) {
  return createTheme({
    cssVariables: true,
    palette: {
      primary: identity.primary,
      background: { default: "#f3f3f3", paper: "#ffffff" },
      text: { primary: "#303438", secondary: "#707579" },
      divider: "#dedfe0",
      error: {
        light: "#ffb74d",
        main: "#f57c00",
        dark: "#a94700",
        contrastText: "#1f1f1f",
      },
    },
    app: {
      header: identity.header,
      headerText: identity.headerText,
      cardTitle: identity.cardTitle,
      surfaces: {
        card: "#eceff1",
        header: "#f5f5f5",
        sidebar: "#f7f8f8",
        reading: "#ffffff",
      },
      layout: { leftWidth: 260, rightWidth: 360 },
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      h4: { fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.2 },
      h5: { fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.25 },
      h6: { fontSize: "1.125rem", fontWeight: 500, lineHeight: 1.35 },
      body1: { fontSize: "0.9375rem", lineHeight: 1.5 },
      body2: { fontSize: "0.90625rem", lineHeight: 1.4 },
      button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" },
      caption: { fontSize: "0.78125rem", lineHeight: 1.4 },
    },
    components,
  });
}
