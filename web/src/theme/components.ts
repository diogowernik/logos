import type { Components, Theme } from "@mui/material/styles";
export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: { minWidth: 320, WebkitFontSmoothing: "antialiased" },
      a: { color: "inherit", textDecoration: "none" },
      "a:focus-visible": {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
      "a:hover": { textDecoration: "underline" },
      svg: { flexShrink: 0 },
      "::selection": { backgroundColor: theme.palette.action.selected },
    }),
  },
  MuiButton: {
    defaultProps: { size: "small", variant: "outlined" },
    styleOverrides: {
      root: { textTransform: "none", fontWeight: 600, minHeight: 32 },
    },
  },
  MuiIconButton: {
    defaultProps: { size: "small" },
    styleOverrides: { root: { width: 36, height: 36, flexShrink: 0 } },
  },
  MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
  MuiInputBase: { styleOverrides: { root: { fontSize: "0.9375rem" } } },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.app.surfaces.card,
        boxShadow: "0 2px 5px rgb(0 0 0 / 12%)",
      }),
    },
  },
  MuiTypography: { defaultProps: { variantMapping: { h6: "h2" } } },
  MuiCardHeader: {
    defaultProps: { slotProps: { title: { variant: "h6" } } },
    styleOverrides: {
      root: ({ theme }) => ({
        padding: "10px 16px",
        minHeight: 52,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.app.surfaces.header,
        color: theme.app.cardTitle,
        gap: 12,
        flexWrap: "wrap",
      }),
      content: { minWidth: 0 },
      action: { alignSelf: "center", margin: 0, marginLeft: "auto" },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { padding: 16, "&:last-child": { paddingBottom: 16 } },
    },
  },
  MuiCardActions: {
    styleOverrides: {
      root: ({ theme }) => ({
        justifyContent: "flex-end",
        padding: "8px 16px",
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.app.surfaces.header,
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({ backgroundColor: theme.app.surfaces.header }),
      outlined: ({ theme }) => ({ borderColor: theme.palette.divider }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        minHeight: 38,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: "1rem",
        fontWeight: 400,
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: { root: { minWidth: 30, color: "inherit" } },
  },
  MuiListItemText: {
    defaultProps: {
      slotProps: {
        primary: { sx: { fontSize: "1rem", fontWeight: 400 }, noWrap: true },
      },
    },
    styleOverrides: { root: { margin: 0, minWidth: 0 } },
  },
  MuiMenuItem: {
    styleOverrides: { root: { fontSize: "0.9375rem", minHeight: 36 } },
  },
  MuiDialog: { defaultProps: { fullWidth: true, maxWidth: "sm" } },
  MuiDialogTitle: {
    styleOverrides: { root: { fontSize: "1.125rem", fontWeight: 500 } },
  },
  MuiDialogContent: { styleOverrides: { root: { paddingTop: 16 } } },
  MuiAlert: { styleOverrides: { root: { fontSize: "0.9375rem" } } },
  MuiTabs: { styleOverrides: { root: { minHeight: 42 } } },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 42,
        padding: "8px 16px",
        fontSize: "0.875rem",
        fontWeight: 500,
        textTransform: "none",
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { padding: "10px 16px", fontSize: "0.90625rem" },
      head: { fontWeight: 600 },
    },
  },
};
