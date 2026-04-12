import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Our family recipe collection",
  appleWebApp: {
    capable: true,
    title: "Recipe Book",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ed7519",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <NextAuthSessionProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </NextAuthSessionProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
