import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sandcastle",
  description: "Private coordination workspace for one friend group."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
