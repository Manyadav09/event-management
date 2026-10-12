import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPulse — live event registration, QR tickets & check-in",
  description:
    "One-time event setup, live auto-updating dashboards for organizers and participants, QR ticket scanning, guest management and deadline control.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-200 antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-white/8 bg-[#05060f]/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-semibold text-slate-200">EventPulse</span> —
              one form, live dashboards, QR gates.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/organize" className="hover:text-white">
                Organizer studio
              </Link>
              <Link href="/events" className="hover:text-white">
                Public events
              </Link>
              <Link href="/scan" className="hover:text-white">
                Gate scanner
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
