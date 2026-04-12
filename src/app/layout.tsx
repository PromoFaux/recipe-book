import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { NextAuthSessionProvider } from "@/components/session-provider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Our family recipe collection",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <NextAuthSessionProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
