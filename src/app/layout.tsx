import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Inventario HCDL",
  description: "Sistema de inventario y soporte TI",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}