import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Fuente de títulos (serif editorial) y de texto (sans limpia).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "SunShade — Toldos y pérgolas a medida",
  description: "Toldos y pérgolas a medida para casas y terrazas. Diseña el tuyo y pide una visita sin compromiso.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${instrument.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  );
}
