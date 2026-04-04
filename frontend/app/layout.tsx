import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTech Reels — AI-Powered Educational Video Feed",
  description:
    "Personalized short-form educational video recommendations powered by a hybrid AI recommendation engine. Tailored for engineering, medical, and MBA aspirants.",
  keywords: [
    "EduTech",
    "Reels",
    "AI",
    "recommendation",
    "education",
    "JEE",
    "NEET",
    "CAT",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
