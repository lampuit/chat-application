import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import './globals.css';

export const metadata: Metadata = {
  title: "Realtime Chat",
  description: "Core realtime chat application built with Next.js and Firebase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
