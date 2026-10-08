import type { AppIdentity } from "@/theme/types";
export const appConfig = {
  name: "Logos",
  navigation: [
    { label: "Biblioteca", href: "/", activePaths: ["/projects", "/texts"] },
  ],
  identity: {
    primary: { main: "#2854a1", dark: "#1c3b71", light: "#5376b4" },
    header: "#1976d2",
    headerText: "#ffffff",
    cardTitle: "#2854a1",
  } satisfies AppIdentity,
};
