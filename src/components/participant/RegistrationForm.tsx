"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Chip } from "@/components/ui";
import type { RegistrationRow } from "@/lib/types";

type GuestDraft = { fullName: string; email: string; designation: string; guestLabel: string };

const CATEGORIES = ["General", "Student", "Professional", "Speaker", "Press", "VIP"];

export default function RegistrationForm({
  slug,
  allowGuests,
  guestsPerRegistration,
  guestSpotsLeft,
}: {
  slug: string;
  allowGuests: boolean;
  guestsPerRegistration: number;
  guestSpotsLeft: number;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    designation: "",
    ticketCategory: "General",
    notes: "",
  });
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    primary: RegistrationRow;
    guests: RegistrationRow[];
    waitlisted: boolean;
    guestsWaitlisted: number;
  } | null>(null);

  const maxGuests = Math.max(
    0,
    Math.min(guestsPerRegistration, allowGuests ? guestSpotsLeft || guestsPerRegistration : 0),
  );

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, guests }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        setError(data?.error ?? "Registration failed. Please try again.");
        return;
      }
      setDone({
        primary: data.registration,
        guests: data.guests ?? [],
        waitlisted: Boolean(data.waitlisted),
        guestsWaitlisted: Number(data.guestsWaitlisted ?? 0),
      });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card strong className="animate-pop p-6">
        <Chip tone={done.waitlisted ? "amber" : "emerald"}>
          {done.waitlisted ? "waitlisted" : "confirmed"}
        </Chip>
        <h3 className="mt-3 text-xl font-semibold text-white">
          You&apos;re on the list, {done.primary.fullName.split(" ")[0]}!
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          {done.waitlisted
            ? "The event is full, so you're on the waitlist. If a seat frees up you're promoted automatically."
            : "Your QR ticket is ready — keep it handy at the entry gate."}
        </p>
        <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
          <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
            Your ticket code
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-white">
            {done.primary.ticketCode}
          </p>
          {done.guests.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Guest passes
              </p>
              {done.guests.map((g) => (
                <p key={g.id} className="font-mono text-sm text-cyan-200">
                  {g.ticketCode} · {g.fullName}
                  {g.status === "waitlisted" ? " (waitlisted)" : ""}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/ticket/${done.primary.ticketCode}`} className="btn btn-primary">
            🎟️ Open my ticket dashboard
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDone(null);
              setForm({
                fullName: "",
                email: "",
                phone: "",
                organization: "",
                designation: "",
                ticketCategory: "General",
                notes: "",
              });
              setGuests([]);
            }}
          >
            Register another person
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card strong className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Chip tone="violet">registration form</Chip>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Reserve your seat
          </h3>
        </div>
        <span className="text-xs text-slate-400">takes ~30 seconds</span>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="fullName">Full name *</label>
            <input
              id="fullName"
              className="input"
              required
              placeholder="Aarav Sharma"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input
              id="phone"
              className="input"
              placeholder="+91 90000 00000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="organization">Company / College</label>
            <input
              id="organization"
              className="input"
              placeholder="Acme Labs"
              value={form.organization}
              onChange={(e) => set("organization", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="designation">Designation</label>
            <input
              id="designation"
              className="input"
              placeholder="Frontend engineer"
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="ticketCategory">Ticket category</label>
            <select
              id="ticketCategory"
              className="select"
              value={form.ticketCategory}
              onChange={(e) => set("ticketCategory", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Anything we should know?</label>
            <input
              id="notes"
              className="input"
              placeholder="Dietary needs, accessibility…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {allowGuests ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">🧑‍🤝‍🧑 Guest section</p>
                <p className="text-xs text-slate-400">
                  Add up to {maxGuests} guest{maxGuests === 1 ? "" : "s"} — each gets a
                  scannable QR pass.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={guests.length >= maxGuests}
                onClick={() =>
                  setGuests((prev) => [
                    ...prev,
                    {
                      fullName: "",
                      email: "",
                      designation: "",
                      guestLabel: `Guest ${prev.length + 1}`,
                    },
                  ])
                }
              >
                + Add guest
              </button>
            </div>
            {guests.length > 0 ? (
              <div className="mt-4 space-y-3">
                {guests.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/8 bg-black/25 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        {g.guestLabel}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-rose-300"
                        onClick={() =>
                          setGuests((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        remove
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input
                        className="input"
                        placeholder="Guest name *"
                        value={g.fullName}
                        onChange={(e) =>
                          setGuests((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, fullName: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="input"
                        placeholder="Email (optional)"
                        value={g.email}
                        onChange={(e) =>
                          setGuests((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, email: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="input"
                        placeholder="Relation (e.g. colleague)"
                        value={g.guestLabel}
                        onChange={(e) =>
                          setGuests((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, guestLabel: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Reserving…" : "Confirm registration →"}
        </button>
        <p className="text-center text-xs text-slate-500">
          A unique QR ticket is generated the moment you submit.
        </p>
      </form>
    </Card>
  );
}
