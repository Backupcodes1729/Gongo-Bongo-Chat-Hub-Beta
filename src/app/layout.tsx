
"use client"; // Required for useEffect

// Removed: import type { Metadata } from "next"; 
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react"; // Import useEffect

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Removed the static metadata export:
// export const metadata: Metadata = {
//   title: "Gongo Bongo Chat Hub",
//   description: "Real-time messaging with AI assistance.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    // Apply theme on initial client load
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      // Ensure light is default if no preference or storedTheme is light
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
