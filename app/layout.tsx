import { ClerkProvider, Show, SignOutButton, UserButton } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { env } from "../env";
import { Nav } from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Motor Trade AI Suite",
  title: "Motor Trade AI Suite",
  description: "Workflow platform for motor trade insurance submissions.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Motor Trade",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
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
          <Show when="signed-in">
            <header className="sticky top-0 z-20 bg-white/95 backdrop-blur">
              <Nav>
                <SignOutButton>
                  <button
                    type="button"
                    className="hidden min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:block"
                  >
                    Sign out
                  </button>
                </SignOutButton>
                <UserButton />
              </Nav>
            </header>
          </Show>
          <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
