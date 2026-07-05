import type { Metadata } from "next";
import { Fraunces, Libre_Franklin, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  weight: "variable",
});

const body = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dataMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Libro Mayor de Albion — Flips en vivo",
  description:
    "Panel de arbitraje para Albion Online: las mejores oportunidades de flipping ahora mismo, calculadas con la API de Albion Online Data Project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${dataMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-ink text-parchment font-body antialiased">
        {children}
      </body>
    </html>
  );
}
