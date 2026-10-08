import type { PaletteOptions } from "@mui/material/styles";
export type AppIdentity = {
  primary: NonNullable<PaletteOptions["primary"]>;
  header: string;
  headerText: string;
  cardTitle: string;
};
declare module "@mui/material/styles" {
  interface Theme {
    app: {
      header: string;
      headerText: string;
      cardTitle: string;
      surfaces: {
        card: string;
        header: string;
        sidebar: string;
        reading: string;
      };
      layout: { leftWidth: number; rightWidth: number };
    };
  }
  interface ThemeOptions {
    app?: Theme["app"];
  }
}
