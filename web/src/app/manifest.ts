import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "books",
    short_name: "books",
    description: "Organize livros, publicações e sua experiência de leitura.",
    id: "/",
    start_url: "/pwa",
    scope: "/",
    lang: "pt-BR",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: appConfig.identity.header,
    prefer_related_applications: false,
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{
      name: "Biblioteca",
      url: "/",
      icons: [{ src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" }],
    }],
  };
}
