import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { AppProviders } from "@/components/AppProviders";
import { appConfig } from "@/config/app";
import "./globals.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
export const metadata: Metadata = {
  title: "books",
  description: "Organize livros, publicações e sua experiência de leitura.",
  applicationName: "books",
  appleWebApp: { capable: true, title: "books", statusBarStyle: "default" },
  icons: {
    icon: "/icons/pwa-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};
export const viewport: Viewport = { themeColor: appConfig.identity.header };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${mono.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
