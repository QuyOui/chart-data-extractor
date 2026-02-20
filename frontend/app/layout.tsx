import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chart Data Extractor",
  description: "Extract structured data from charts in PDFs and images using AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
