import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import './globals.css';

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Realtime Chat",
  description: "Core realtime chat application built with Next.js and Firebase.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
