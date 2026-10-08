import type { AppIdentity } from "@/theme/types";
export const appConfig = {
  name: "Logos",
  navigation: [
    { label: "Biblioteca", href: "/", activePaths: ["/projects", "/texts"] },
  ],
  identity: {
    primary: { main: "#4b555d", dark: "#30383e", light: "#77828a" },
    header: "#4b555d",
    headerText: "#ffffff",
    cardTitle: "#394148",
  } satisfies AppIdentity,
};
