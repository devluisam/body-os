import type { Metadata } from "next";
import "./globals.css";
import "./product.css";

export const metadata: Metadata = {
  title: "BODY OS · Composição & Performance",
  description:
    "Seu sistema pessoal de composição corporal, alimentação e performance no Jiu-Jitsu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BODY OS",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    apple: "/icon-192.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased" data-bodyos-shell="1">
        {children}
      </body>
    </html>
  );
}
