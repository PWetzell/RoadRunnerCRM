import type { Metadata } from "next";
import { Suspense } from "react";
import { Mulish } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import AuthGate from "@/components/auth/AuthGate";
import KeyboardShortcuts from "@/components/keyboard/KeyboardShortcuts";
import AlertAutoGenMount from "@/components/alerts/AlertAutoGenMount";
import ManageListsDialog from "@/components/lists/ManageListsDialog";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Roadrunner CRM — AI-Assisted Contacts",
  description: "AI-powered CRM with smart data entry and multi-source typeahead.",
  icons: {
    icon: "/roadrunner-logo-black.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mulish.variable} h-full`}>
      <body className="h-full overflow-hidden">
        <AuthGate>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar reads `useSearchParams()` (for the ?list= query), which
                Next.js requires be wrapped in a Suspense boundary so
                statically-prerendered pages (e.g. the 404) don't bail out of
                client-side rendering. A sidebar-shaped placeholder avoids
                layout shift during the initial stream. */}
            <Suspense fallback={<div className="w-[var(--sidebar-w)] flex-shrink-0 bg-[var(--sidebar-bg)]" />}>
              <Sidebar />
            </Suspense>
            <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[var(--surface-bg)]">
              {/* Page-level Suspense — any route that calls `useSearchParams()`
                  (Contacts, Sales, Documents, etc.) needs this so Next.js can
                  statically prerender the shell while the client component
                  hydrates against the real URL. */}
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </main>
          </div>
          <KeyboardShortcuts />
          <AlertAutoGenMount />
          <ManageListsDialog />
        </AuthGate>
      </body>
    </html>
  );
}
