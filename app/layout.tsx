import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewReel MVP",
  description: "Turn local business reviews into short-form marketing videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
