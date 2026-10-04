import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// Serif fina para títulos; Plex Sans para texto y Plex Mono para medidas y códigos.
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif", display: "swap" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Cota — Cortinas y persianas para colegios y oficinas",
  description: "Cortinas enrollables, blackout, screen y verticales para colegios, universidades y oficinas en Perú. Cotiza por plano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  );
}
