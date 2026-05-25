import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { env } from "../env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motor Trade AI Suite",
  description: "Workflow platform for motor trade insurance submissions.",
};

void env;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
