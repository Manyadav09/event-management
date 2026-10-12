"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/organize", label: "Organizer" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOrganizer = pathname?.startsWith("/organizer") || pathname === "/organize";
  const isParticipant = pathname?.startsWith("/ticket") || pathname?.startsWith("/e/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#05060f]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-violet-900/40">
            EV
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-white">
              EventPulse
            </span>
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
              live event ops
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="mx-2 h-5 w-px bg-white/10" />
          <span
            className={`hidden rounded-lg px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] lg:inline-flex ${
              isOrganizer
                ? "bg-violet-500/15 text-violet-200"
                : isParticipant
                  ? "bg-cyan-500/15 text-cyan-200"
                  : "bg-white/5 text-slate-400"
            }`}
          >
            {isOrganizer
              ? "Organizer view"
              : isParticipant
                ? "Participant view"
                : "Guest mode"}
          </span>
          <Link href="/events" className="btn btn-ghost btn-sm">
            Register
          </Link>
          <Link href="/organize" className="btn btn-primary btn-sm">
            Create event
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost btn-sm md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/8 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/organize"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-2"
            >
              Create event
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
