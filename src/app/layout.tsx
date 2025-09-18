import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indiefindr",
  description: "Discover your next favorite indie game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b bg-white">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold">
              Indiefindr
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign In
              </a>
              <a
                href="/auth/sign-up"
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </a>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-6 bg-background">{children}</main>
      </body>
    </html>
  );
}
