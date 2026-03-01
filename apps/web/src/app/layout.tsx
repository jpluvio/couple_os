import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Couple OS",
  description:
    "Your shared digital space — communication, organization, finances, and memories for couples.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
