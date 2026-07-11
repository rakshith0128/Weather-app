import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Varsha — Monsoon Readiness",
  description: "GenAI-powered monsoon preparedness assistant, grounded in real live weather data.",
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-body text-ink antialiased">{children}</body>
    </html>
  );
}
