"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RegistrationForm from "./RegistrationForm";
import { Card, Chip, LiveDot } from "@/components/ui";
import { usePoll } from "@/hooks/usePoll";
import type { PublicSnapshot } from "@/lib/types";
import { OPEN_COPY } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { LiveCountdown } from "./LiveCountdown";

export function RegistrationGate({
  initial,
}: {
  initial: PublicSnapshot;
}) {
  const slug = initial.event.slug;
  const { data, lastUpdated, live } = usePoll<PublicSnapshot>(
    `/api/events/${slug}?scope=public`,
    { interval: 5000 },
  );
  const snap: PublicSnapshot = data ?? initial;
  const { event, state, stats } = snap;
  const open = state.open;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <LiveDot live={live} /> live status
        </span>
        <span>
          {lastUpdated
            ? `synced ${lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : ""}
        </span>
      </div>

      <Card
        strong
        className={`p-5 ${open ? "" : "border-rose-400/25 bg-rose-500/[0.06]"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Chip tone={open ? "emerald" : "rose"}>
              {open ? "● registration open" : "🔒 registration closed"}
            </Chip>
            <p className="mt-2 text-sm text-slate-300">
              {OPEN_COPY[state.reason] ?? state.reason}
            </p>
          </div>
          <div className="min-w-[220px] flex-1">
            <LiveCountdown target={event.registrationDeadline} label="deadline timer" />
          </div>
        </div>
      </Card>

      {open ? (
        <RegistrationForm
          key={`${stats.participantCapacity}-${stats.guestCapacity}`}
          slug={slug}
          allowGuests={event.allowGuests}
          guestsPerRegistration={event.guestsPerRegistration}
          guestSpotsLeft={stats.guestSpotsLeft}
        />
      ) : (
        <Card strong className="p-6">
          <h3 className="text-lg font-semibold text-white">
            Registration has closed
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            The deadline was {formatDateTime(event.registrationDeadline)}. The
            organizer can extend it from the dashboard — this page unlocks
            itself the moment that happens.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {stats.spotsLeft > 0 ? (
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                {stats.spotsLeft} seats still unclaimed
              </span>
            ) : null}
            <Link href="/events" className="btn btn-ghost btn-sm">
              Browse other events
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export function TicketLookup({ slug }: { slug?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = code.trim().toUpperCase();
        if (!clean) return;
        router.push(`/ticket/${encodeURIComponent(clean)}`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        className="input font-mono"
        placeholder="Have a ticket? Enter code e.g. TCK-4KP2XR"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" className="btn btn-ghost">
        🎟️ Open my ticket
      </button>
      {slug ? <span className="sr-only">{slug}</span> : null}
    </form>
  );
}
