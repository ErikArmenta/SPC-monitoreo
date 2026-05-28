import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema SPC en Tiempo Real",
  description: "Monitoreo de procesos industriales con control estadístico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-inter antialiased bg-[#e0e5ec] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
