import type { Metadata, Viewport } from "next";
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

// viewport-fit=cover makes env(safe-area-inset-*) report the notch and the
// home indicator on iPhone; without it the dock sits under the indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101412",
};

// Applies the last chosen theme before the first paint, so the light theme
// does not flash dark while the records load.
const THEME = `try{var t=localStorage.getItem("bodyos-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body className="antialiased" data-bodyos-shell="1">
        {children}
      </body>
    </html>
  );
}
