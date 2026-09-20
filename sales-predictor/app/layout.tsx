import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AdSales AI — Polynomial Regression Sales Predictor",
  description:
    "Predict product sales from advertising budgets across TV, Radio, and Newspaper channels using a degree-2 polynomial regression model. Identify diminishing returns and optimize your marketing ROI.",
  keywords: ["advertising", "sales prediction", "polynomial regression", "machine learning", "marketing ROI"],
  openGraph: {
    title: "AdSales AI — Sales Predictor",
    description: "Data-driven sales prediction from advertising budgets",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased bg-slate-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
