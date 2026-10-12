"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Chip, EmptyState, LiveDot, Progress, StatTile, Toast } from "@/components/ui";
import { LiveCountdown } from "@/components/participant/LiveCountdown";
import { useNow, usePoll } from "@/hooks/usePoll";
import type { TicketSnapshot } from "@/lib/types";
import { OPEN_COPY } from "@/lib/types";
import {
  countdownFrom,
  formatDate,
  formatDateTime,
  formatTime,
  statusLabel,
  statusTone,
} from "@/lib/format";

const STEPS = ["registered", "confirmed", "checked_in"] as const;

export default function TicketDashboard({
  initial,
  qrDataUrl,
}: {
  initial: TicketSnapshot;
  qrDataUrl: string;
}) {
  const code = initial.registration.ticketCode;
  const { data, lastUpdated, live, refresh } = usePoll<TicketSnapshot>(
    `/api/tickets/${code}`,
    { interval: 5000 },
  );
  const snap: TicketSnapshot = data ?? initial;
  const { registration, event, guests, stats, state } = snap;
  const now = useNow(1000);
  const [toast, setToast] = useState<{ tone: "success" | "warn" | "danger"; title: string; body?: string } | null>(null);
  const [guest, setGuest] = useState({ fullName: "", email: "", guestLabel: "Guest" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isPrimary = !registration.primaryRegistrationId;
  const cancelled = registration.status === "cancelled";
  const canAddGuest =
    isPrimary &&
    event.allowGuests &&
    state.open &&
    guests.length < event.guestsPerRegistration;

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: cancelled ? "restore" : "cancel" }),
      });
      const out = await res.json();
      if (!res.ok || out?.ok === false) {
        setToast({ tone: "danger", title: out?.error ?? "Action failed" });
      } else {
        setToast({
          tone: "success",
          title: cancelled ? "Registration restored" : "Registration cancelled",
          body: cancelled ? undefined : "Your seat is released to the waitlist.",
        });
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (guest.fullName.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(guest),
      });
      const out = await res.json();
      if (!res.ok || out?.ok === false) {
        setToast({ tone: "danger", title: out?.error ?? "Could not add guest" });
      } else {
        setToast({
          tone: out.waitlisted ? "warn" : "success",
          title: `${guest.fullName} added`,
          body: out.waitlisted ? "Guest is waitlisted — quota is full." : "Guest QR pass created.",
        });
        setGuest({ fullName: "", email: "", guestLabel: "Guest" });
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const toEvent = countdownFrom(event.startsAt, now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Chip tone="sky">participant dashboard</Chip>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {event.name}
          </h1>
          <p className="text-sm text-slate-400">
            {formatDate(event.startsAt)} · {formatTime(event.startsAt)} ·{" "}
            {event.venue || "Venue TBA"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <LiveDot live={live} /> {lastUpdated ? `synced ${lastUpdated.toLocaleTimeString()}` : ""}
        </div>
      </div>

      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Ticket */}
        <Card strong className="overflow-hidden p-0">
          <div className="relative bg-gradient-to-br from-violet-600/40 via-indigo-600/30 to-cyan-500/25 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.2em] text-white/70">
                  {registration.type === "guest" ? "guest pass" : "participant pass"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {registration.fullName}
                </h2>
                <p className="text-xs text-white/75">
                  {registration.designation
                    ? `${registration.designation} · `
                    : ""}
                  {registration.organization || registration.ticketCategory}
                </p>
              </div>
              <span className="rounded-xl bg-black/35 px-3 py-1.5 font-mono text-sm font-semibold tracking-widest text-white">
                {registration.ticketCode}
              </span>
            </div>
          </div>

          <div className="grid place-items-center gap-4 border-t border-white/10 bg-black/25 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR ticket ${registration.ticketCode}`}
              className="h-52 w-52 rounded-2xl bg-white p-3 shadow-xl"
            />
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                scan at the gate
              </p>
              <p className={`mt-1 text-sm font-semibold ${statusTone(registration.status)}`}>
                {statusLabel(registration.status)}
              </p>
              {registration.checkedInAt ? (
                <p className="text-xs text-slate-400">
                  checked in {formatDateTime(registration.checkedInAt)}
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-wrap gap-2">
              <a className="btn btn-ghost btn-sm flex-1" href={qrDataUrl} download={`${registration.ticketCode}.png`}>
                ⬇️ Save QR
              </a>
              <Link href={`/e/${event.slug}`} className="btn btn-ghost btn-sm flex-1">
                ℹ️ Event page
              </Link>
            </div>
          </div>

          <div className="flex items-stretch border-t border-dashed border-white/15 px-5 py-4">
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  Category
                </dt>
                <dd className="text-slate-200">{registration.ticketCategory}</dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  Guests on pass
                </dt>
                <dd className="text-slate-200">{guests.length}</dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  Registered
                </dt>
                <dd className="text-slate-200">{formatDateTime(registration.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  Seat status
                </dt>
                <dd className="text-slate-200">
                  {registration.status === "waitlisted" ? "Waitlist" : "Confirmed"}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Status tracker */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Your journey</h3>
              <Chip tone={cancelled ? "rose" : "emerald"}>
                {cancelled ? "cancelled" : "active"}
              </Chip>
            </div>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, i) => {
                const reached =
                  step === "registered" ||
                  (step === "confirmed" &&
                    (registration.status === "confirmed" ||
                      registration.status === "checked_in")) ||
                  (step === "checked_in" && registration.status === "checked_in");
                return (
                  <li key={step} className="flex items-center gap-3">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                        reached
                          ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                          : "bg-white/5 text-slate-500 ring-1 ring-white/10"
                      }`}
                    >
                      {reached ? "✓" : i + 1}
                    </span>
                    <span className={reached ? "text-slate-100" : "text-slate-500"}>
                      {step === "registered"
                        ? "Registration submitted"
                        : step === "confirmed"
                          ? "Seat confirmed"
                          : "Checked in at the gate"}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Event capacity used</span>
                <span>{stats.participantFill}%</span>
              </div>
              <Progress value={stats.participantFill} tone="cyan" />
            </div>
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-slate-400">
              {OPEN_COPY[state.reason] ?? state.reason}
            </div>
          </Card>

          {/* Countdown */}
          <Card className="p-5">
            <h3 className="font-semibold text-white">Event countdown</h3>
            <div className="mt-4">
              <LiveCountdown target={event.startsAt} label="event begins in" />
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Registration {state.open ? "closes" : "closed"}{" "}
              {formatDateTime(event.registrationDeadline)} ({countdownFrom(event.registrationDeadline, now).label})
            </p>
          </Card>

          {/* Guests */}
          {isPrimary ? (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Guest section</h3>
                <span className="text-xs text-slate-400">
                  {guests.length}/{event.guestsPerRegistration} added
                </span>
              </div>
              {guests.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon="🧑‍🤝‍🧑"
                    title="No guests yet"
                    body={
                      event.allowGuests
                        ? state.open
                          ? "Add a guest below — they get their own QR pass."
                          : "Registration is closed, so guests can no longer be added."
                        : "This event does not allow guests."
                    }
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {guests.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{g.fullName}</p>
                        <p className="font-mono text-xs text-cyan-200">{g.ticketCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${statusTone(g.status)}`}>
                          {statusLabel(g.status)}
                        </span>
                        <Link href={`/ticket/${g.ticketCode}`} className="btn btn-ghost btn-sm">
                          Pass
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {canAddGuest ? (
                <form onSubmit={addGuest} className="mt-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      className="input"
                      placeholder="Guest name *"
                      value={guest.fullName}
                      onChange={(e) => setGuest({ ...guest, fullName: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Email (optional)"
                      value={guest.email}
                      onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Relation"
                      value={guest.guestLabel}
                      onChange={(e) => setGuest({ ...guest, guestLabel: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                    {busy ? "Adding…" : "➕ Add guest pass"}
                  </button>
                </form>
              ) : null}
            </Card>
          ) : (
            <Card className="p-5">
              <h3 className="font-semibold text-white">Guest pass</h3>
              <p className="mt-2 text-sm text-slate-400">
                You are registered as a guest. Your host manages the booking —
                your QR above works at the same gate.
              </p>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-5">
            <h3 className="font-semibold text-white">Manage registration</h3>
            <p className="mt-1 text-sm text-slate-400">
              {cancelled
                ? "Your registration is cancelled. You can restore it while seats last."
                : "Can't make it? Cancel to release your seat to the waitlist."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn btn-sm ${cancelled ? "btn-primary" : "btn-danger"}`}
                disabled={busy || (!cancelled && !state.open)}
                onClick={cancel}
              >
                {cancelled ? "↩️ Restore registration" : "❌ Cancel my registration"}
              </button>
              <Link href="/events" className="btn btn-ghost btn-sm">
                Browse events
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Event at a glance */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Seats left" value={stats.spotsLeft} hint={`of ${stats.participantCapacity}`} accent="cyan" icon="🪑" />
        <StatTile label="Total registered" value={stats.total} hint={`${stats.guests} guests`} accent="violet" icon="👥" />
        <StatTile label="Starts in" value={toEvent.days + "d"} hint={`${toEvent.hours}h ${toEvent.minutes}m`} accent="emerald" icon="⏱️" />
      </div>
    </div>
  );
}
