import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import PageLoader from "@/components/layout/PageLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dodz Fried Chicken | Crispy Chicken & Beef Burgers in Egypt",
  description: "Order the crispiest fried chicken, premium beef burgers, loaded fries, and delicious meals from Dodz. Fast delivery and local pickup in Egypt.",
  keywords: ["Dodz Fried Chicken", "Burgers Egypt", "Fried Chicken Cairo", "Dodz Burger", "Dodz Fire Chicken", "Fast Food Egypt"],
  authors: [{ name: "Dodz Restaurant Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}>
      <body className="min-h-full bg-background text-foreground flex flex-col antialiased overflow-x-hidden">
        <Providers>
          <PageLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
