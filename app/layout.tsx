import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motor Trade AI Suite",
  description: "Workflow platform for motor trade insurance submissions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
