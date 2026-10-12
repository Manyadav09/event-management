"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Chip,
  EmptyState,
  LiveDot,
  Progress,
  StatTile,
  Toast,
} from "@/components/ui";
import { useNow, usePoll } from "@/hooks/usePoll";
import type {
  EventRow,
  LiveSnapshot,
  RegistrationOpenState,
  RegistrationRow,
  EventStats,
} from "@/lib/types";
import { OPEN_COPY } from "@/lib/types";
import {
  countdownFrom,
  formatDate,
  formatDateTime,
  statusLabel,
  statusTone,
  toLocalInput,
} from "@/lib/format";

type Tab = "overview" | "records" | "guests" | "gate" | "timeline";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "records", label: "Registration records", icon: "🗂️" },
  { id: "guests", label: "Guest section", icon: "🧑‍🤝‍🧑" },
  { id: "gate", label: "QR gate & scans", icon: "📷" },
  { id: "timeline", label: "Timeline & deadline", icon: "⏱️" },
];

export default function OrganizerDashboard({
  initial,
}: {
  initial: LiveSnapshot;
}) {
  const slug = initial.event.slug;
  const { data, refreshing, lastUpdated, live, refresh } =
    usePoll<LiveSnapshot>(`/api/events/${slug}`, { interval: 5000 });
  const snapshot: LiveSnapshot = data ?? initial;
  const { event, stats, state } = snapshot;
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<
    { tone: "success" | "warn" | "danger"; title: string; body?: string } | null
  >(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function patchEvent(payload: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!res.ok || out?.ok === false) {
        setToast({ tone: "danger", title: out?.error ?? "Update failed" });
      } else {
        setToast({ tone: "success", title: label });
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card strong className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="violet">organizer dashboard</Chip>
              <Chip tone={state.open ? "emerald" : "rose"}>
                {OPEN_COPY[state.reason] ?? state.reason}
              </Chip>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <LiveDot live={live} /> auto-updating ·{" "}
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—"}
                {refreshing ? " syncing…" : ""}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {event.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {formatDateTime(event.startsAt)} · {event.venue || "Venue TBA"}
              {event.city ? `, ${event.city}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/e/${slug}`} className="btn btn-ghost btn-sm">
              👁️ Public page
            </Link>
            <Link href={`/organizer/${slug}/scan`} className="btn btn-primary btn-sm">
              📷 Open scanner
            </Link>
            <Link href="/organize" className="btn btn-ghost btn-sm">
              ✏️ Edit form
            </Link>
          </div>
        </div>
        {toast ? (
          <div className="mt-4">
            <Toast {...toast} onClose={() => setToast(null)} />
          </div>
        ) : null}
      </Card>

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total records"
          value={stats.total}
          hint={`${stats.participants} participants · ${stats.guests} guests`}
          accent="violet"
          icon="👥"
        />
        <StatTile
          label="Seats confirmed"
          value={`${stats.participantCapacity - stats.spotsLeft}/${stats.participantCapacity}`}
          hint={`${stats.participantFill}% of participant quota`}
          accent="cyan"
          icon="🎟️"
        />
        <StatTile
          label="Guests confirmed"
          value={`${stats.guestCapacity - stats.guestSpotsLeft}/${stats.guestCapacity}`}
          hint={event.allowGuests ? `${stats.guestFill}% of guest quota` : "Guests disabled"}
          accent="emerald"
          icon="🧑‍🤝‍🧑"
        />
        <StatTile
          label="Checked in"
          value={stats.checkedIn}
          hint={`${stats.scanRate}% of confirmed list`}
          accent="amber"
          icon="✅"
        />
      </div>

      {/* Tabs */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`btn btn-sm shrink-0 ${
              tab === t.id ? "btn-primary" : "btn-ghost"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Live registration pulse</h3>
              <span className="text-xs text-slate-500">
                last record {formatDateTime(stats.lastActivityAt)}
              </span>
            </div>
            <div className="mt-5 space-y-5">
              <QuotaRow
                title="Participants"
                value={stats.participantCapacity - stats.spotsLeft}
                capacity={stats.participantCapacity}
                tone="violet"
              />
              <QuotaRow
                title="Guests"
                value={stats.guestCapacity - stats.guestSpotsLeft}
                capacity={stats.guestCapacity}
                tone="cyan"
              />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Confirmed" value={stats.confirmed} tone="text-emerald-300" />
              <MiniStat label="Waitlisted" value={stats.waitlisted} tone="text-amber-300" />
              <MiniStat label="Cancelled" value={stats.cancelled} tone="text-rose-300" />
            </div>
            <h4 className="mt-7 text-sm font-semibold text-white">
              Latest registrations
            </h4>
            <div className="mt-3 space-y-2">
              {snapshot.recent.length === 0 ? (
                <EmptyState
                  icon="🕐"
                  title="No registrations yet"
                  body="Share the public event link — new records appear here automatically."
                />
              ) : (
                snapshot.recent.slice(0, 6).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{r.fullName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {r.type === "guest" ? `Guest · ${r.guestLabel}` : r.ticketCategory} ·{" "}
                        <span className="font-mono">{r.ticketCode}</span>
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${statusTone(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setTab("records")}
              className="mt-4 inline-flex text-sm text-violet-300 hover:text-violet-200"
            >
              View all registration records →
            </button>
          </Card>

          <div className="space-y-5">
            <DeadlineCard
              event={event}
              state={state}
              onPatch={patchEvent}
              busy={busy}
            />
            <Card className="p-5">
              <h3 className="font-semibold text-white">Announce to attendees</h3>
              <AnnouncementComposer
                slug={slug}
                announcements={snapshot.announcements}
                onDone={refresh}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "records" ? (
        <RecordsPanel slug={slug} onToast={setToast} onRefresh={refresh} />
      ) : null}

      {tab === "guests" ? (
        <GuestsPanel slug={slug} stats={stats} allowGuests={event.allowGuests} />
      ) : null}

      {tab === "gate" ? <GatePanel slug={slug} scans={snapshot.scans} stats={stats} /> : null}

      {tab === "timeline" ? (
        <TimelinePanel event={event} onPatch={patchEvent} busy={busy} state={state} />
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function QuotaRow({
  title,
  value,
  capacity,
  tone,
}: {
  title: string;
  value: number;
  capacity: number;
  tone: "violet" | "cyan";
}) {
  const pct = capacity ? Math.round((value / capacity) * 100) : 0;
  return (
    <div>
      <div className="flex items-end justify-between text-sm">
        <span className="font-medium text-slate-200">{title}</span>
        <span className="text-slate-400">
          <span className="text-lg font-semibold text-white">{value}</span> /{" "}
          {capacity} ({pct}%)
        </span>
      </div>
      <div className="mt-2">
        <Progress value={pct} tone={tone} />
      </div>
    </div>
  );
}

function DeadlineCard({
  event,
  state,
  onPatch,
  busy,
}: {
  event: EventRow;
  state: RegistrationOpenState;
  onPatch: (payload: Record<string, unknown>, label: string) => Promise<void>;
  busy: string | null;
}) {
  const now = useNow(1000);
  const toDeadline = countdownFrom(event.registrationDeadline, now);
  const toStart = countdownFrom(event.startsAt, now);
  return (
    <Card strong className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Registration deadline</h3>
        <Chip tone={toDeadline.past ? "rose" : "emerald"}>
          {toDeadline.past ? "closed" : "open"}
        </Chip>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">
        {toDeadline.label}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        closes {formatDateTime(event.registrationDeadline)}
      </p>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-slate-400">
        Event starts in <span className="text-slate-200">{toStart.label}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy !== null}
          onClick={() => {
            const d = new Date(event.registrationDeadline.replace(" ", "T"));
            d.setDate(d.getDate() + 1);
            const pad = (n: number) => String(n).padStart(2, "0");
            const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate(),
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            void onPatch({ registrationDeadline: value }, "Deadline extended by 1 day");
          }}
        >
          ⏭️ Extend deadline +1 day
        </button>
        {event.registrationManuallyClosed ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy !== null}
            onClick={() => onPatch({ registrationManuallyClosed: false }, "Registration reopened")}
          >
            🔓 Reopen registration
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={busy !== null}
            onClick={() => onPatch({ registrationManuallyClosed: true }, "Registration closed now")}
          >
            🔒 Close registration now
          </button>
        )}
        <p className="text-center text-[0.7rem] text-slate-500">
          {state.open ? "Form is accepting responses" : `Locked — ${OPEN_COPY[state.reason]}`}
        </p>
      </div>
    </Card>
  );
}

function RecordsPanel({
  slug,
  onToast,
  onRefresh,
}: {
  slug: string;
  onToast: (t: { tone: "success" | "warn" | "danger"; title: string; body?: string }) => void;
  onRefresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  const url = useMemo(
    () =>
      `/api/events/${slug}/registrations?type=${type}&status=${status}&q=${encodeURIComponent(
        debounced,
      )}`,
    [slug, type, status, debounced],
  );
  const { data, refresh } = usePoll<{ registrations: RegistrationRow[]; count: number }>(url, {
    interval: 6000,
  });
  const rows = data?.registrations ?? [];

  async function act(code: string, payload: Record<string, unknown>, label: string) {
    const res = await fetch(`/api/registrations/${code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    if (!res.ok || out?.ok === false) {
      onToast({ tone: "danger", title: out?.error ?? "Action failed" });
    } else {
      onToast({ tone: "success", title: label });
      await Promise.all([refresh(), onRefresh()]);
    }
  }

  async function checkIn(code: string) {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, slug, mode: "checkin" }),
    });
    const out = await res.json();
    const outcome = out?.outcome;
    if (outcome) {
      onToast({ tone: outcome.tone, title: outcome.message });
      await Promise.all([refresh(), onRefresh()]);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Registration records</h3>
          <p className="text-xs text-slate-400">
            {data ? `${data.count} record(s) · live` : "loading…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="btn btn-ghost btn-sm"
            href={`/api/events/${slug}/registrations?format=csv&type=${type}&status=${status}&q=${encodeURIComponent(
              debounced,
            )}`}
          >
            ⬇️ Export CSV
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <input
          className="input"
          placeholder="Search name, email, phone, code, company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All records</option>
          <option value="participant">Participants</option>
          <option value="guest">Guests</option>
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Any status</option>
          <option value="active">Confirmed + checked in</option>
          <option value="confirmed">Confirmed</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="checked_in">Checked in</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="No matching records"
            body="Registrations show up here the moment they are submitted."
          />
        ) : (
          <table className="data w-full min-w-[880px]">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registered</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs text-violet-200">{r.ticketCode}</td>
                  <td>
                    <span className="font-medium text-white">{r.fullName}</span>
                    {r.organization ? (
                      <span className="block text-xs text-slate-400">
                        {r.designation ? `${r.designation} · ` : ""}
                        {r.organization}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-xs text-slate-400">
                    {r.email || "—"}
                    <span className="block">{r.phone || ""}</span>
                  </td>
                  <td>
                    <Chip tone={r.type === "guest" ? "sky" : "violet"}>
                      {r.type === "guest" ? r.guestLabel || "guest" : r.ticketCategory}
                    </Chip>
                  </td>
                  <td className={statusTone(r.status)}>{statusLabel(r.status)}</td>
                  <td className="text-xs text-slate-400">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {r.status === "checked_in" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => act(r.ticketCode, { action: "undo-checkin" }, "Check-in reverted")}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={r.status !== "confirmed"}
                          onClick={() => checkIn(r.ticketCode)}
                        >
                          ✅ Check in
                        </button>
                      )}
                      {r.status === "waitlisted" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => act(r.ticketCode, { status: "confirmed" }, "Confirmed from waitlist")}
                        >
                          Confirm
                        </button>
                      ) : null}
                      {r.status !== "cancelled" ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => act(r.ticketCode, { action: "cancel" }, "Registration cancelled")}
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => act(r.ticketCode, { action: "restore" }, "Registration restored")}
                        >
                          Restore
                        </button>
                      )}
                      <Link href={`/ticket/${r.ticketCode}`} className="btn btn-ghost btn-sm">
                        Ticket
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function GuestsPanel({
  slug,
  stats,
  allowGuests,
}: {
  slug: string;
  stats: EventStats;
  allowGuests: boolean;
}) {
  const { data } = usePoll<{ registrations: RegistrationRow[] }>(
    `/api/events/${slug}/registrations?type=guest`,
    { interval: 6000 },
  );
  const guests = data?.registrations ?? [];
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Card strong className="p-5">
        <Chip tone="sky">guest section</Chip>
        <h3 className="mt-3 text-lg font-semibold text-white">
          Guests at the event
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Guests are attached to a participant&apos;s pass but get their own QR
          ticket and gate scan record.
        </p>
        <div className="mt-5 space-y-4">
          <QuotaRow
            title="Guest quota"
            value={stats.guestCapacity - stats.guestSpotsLeft}
            capacity={stats.guestCapacity}
            tone="cyan"
          />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-xs text-slate-400">Guest records</dt>
            <dd className="mt-1 text-xl font-semibold text-white">{stats.guests}</dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <dt className="text-xs text-slate-400">Guests inside</dt>
            <dd className="mt-1 text-xl font-semibold text-emerald-300">
              {guests.filter((g) => g.status === "checked_in").length}
            </dd>
          </div>
        </dl>
        {!allowGuests ? (
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Guests are turned off in the setup form — enable “Guest section” to
            accept them.
          </p>
        ) : null}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-white">Guest list</h3>
        {guests.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="🧑‍🤝‍🧑"
              title="No guests yet"
              body="Participants can add guests from their ticket dashboard while registration is open."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="data w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Guest</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Checked in</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td className="font-mono text-xs text-cyan-200">{g.ticketCode}</td>
                    <td className="font-medium text-white">{g.fullName}</td>
                    <td className="text-xs text-slate-400">{g.guestLabel}</td>
                    <td className={statusTone(g.status)}>{statusLabel(g.status)}</td>
                    <td className="text-xs text-slate-400">
                      {g.checkedInAt ? formatDateTime(g.checkedInAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function GatePanel({
  slug,
  scans,
  stats,
}: {
  slug: string;
  scans: LiveSnapshot["scans"];
  stats: EventStats;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card strong className="p-5">
        <Chip tone="emerald">qr gate</Chip>
        <h3 className="mt-3 text-lg font-semibold text-white">
          Ticket scanning system
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Use the camera scanner or type a ticket code. Every scan is logged
          below and reflected in both dashboards instantly.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-slate-400">Checked in</p>
            <p className="mt-1 text-xl font-semibold text-white">{stats.checkedIn}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-slate-400">Scan rate</p>
            <p className="mt-1 text-xl font-semibold text-emerald-300">{stats.scanRate}%</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Link href={`/organizer/${slug}/scan`} className="btn btn-primary">
            📷 Launch full-screen scanner
          </Link>
          <Link href={`/organizer/${slug}/scan?mode=manual`} className="btn btn-ghost">
            ⌨️ Manual code entry
          </Link>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-white">Live scan log</h3>
        {scans.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="📷" title="No scans yet" body="Scan history appears here in real time." />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {scans.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    <span className="font-mono text-xs text-slate-300">{s.ticketCode}</span>{" "}
                    — {s.message}
                  </p>
                  <p className="text-[0.7rem] text-slate-500">
                    {formatDateTime(s.createdAt)} · {s.scannedBy}
                  </p>
                </div>
                <Chip
                  tone={
                    s.result === "check_in"
                      ? "emerald"
                      : s.result === "duplicate" || s.result === "undo"
                        ? "amber"
                        : "rose"
                  }
                >
                  {s.result.replace("_", " ")}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AnnouncementComposer({
  slug,
  announcements,
  onDone,
}: {
  slug: string;
  announcements: LiveSnapshot["announcements"];
  onDone: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("info");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return;
    setBusy(true);
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, title, body, tone }),
      });
      setTitle("");
      setBody("");
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/announcements?slug=${slug}&id=${id}`, { method: "DELETE" });
    await onDone();
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-2">
        <input
          className="input"
          placeholder="e.g. Venue changed to Hall B"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="textarea min-h-16"
          placeholder="Extra details (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="select"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option value="info">Info</option>
            <option value="success">Good news</option>
            <option value="warning">Warning</option>
            <option value="danger">Urgent</option>
          </select>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Posting…" : "📣 Push update"}
          </button>
        </div>
      </form>
      {announcements.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  {a.body ? (
                    <p className="text-xs text-slate-400">{a.body}</p>
                  ) : null}
                  <p className="mt-1 text-[0.68rem] text-slate-500">
                    {formatDateTime(a.createdAt)} · {a.tone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-xs text-slate-500 hover:text-rose-300"
                  aria-label="Delete announcement"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TimelinePanel({
  event,
  onPatch,
  busy,
  state,
}: {
  event: EventRow;
  onPatch: (payload: Record<string, unknown>, label: string) => Promise<void>;
  busy: string | null;
  state: RegistrationOpenState;
}) {
  const [deadline, setDeadline] = useState(toLocalInput(event.registrationDeadline));
  const [start, setStart] = useState(toLocalInput(event.startsAt));
  const [end, setEnd] = useState(toLocalInput(event.endsAt));
  const [capacity, setCapacity] = useState(event.capacity);
  const [guestCapacity, setGuestCapacity] = useState(event.guestCapacity);

  const steps = [
    { label: "Registration opens", at: event.createdAt, done: true },
    {
      label: "Registration deadline",
      at: event.registrationDeadline,
      done: true,
    },
    { label: "Event starts", at: event.startsAt, done: true },
    { label: "Event ends", at: event.endsAt, done: false },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card strong className="p-5">
        <h3 className="font-semibold text-white">Date, time &amp; quota controls</h3>
        <p className="mt-1 text-xs text-slate-400">
          Save and every page — public, participant, organizer — updates itself.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Registration deadline</label>
            <input
              type="datetime-local"
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Event starts</label>
            <input
              type="datetime-local"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Event ends</label>
            <input
              type="datetime-local"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Participant capacity</label>
            <input
              type="number"
              className="input"
              value={capacity}
              min={1}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Guest capacity</label>
            <input
              type="number"
              className="input"
              value={guestCapacity}
              min={0}
              onChange={(e) => setGuestCapacity(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={busy !== null}
              onClick={() =>
                onPatch(
                  {
                    registrationDeadline: deadline,
                    startsAt: start,
                    endsAt: end,
                    capacity,
                    guestCapacity,
                  },
                  "Timeline & quotas updated",
                )
              }
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Current state</p>
          <p className="mt-1 text-xs text-slate-400">
            {OPEN_COPY[state.reason]} · deadline{" "}
            {formatDateTime(event.registrationDeadline)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["published", "Publish event"],
                ["draft", "Unpublish (draft)"],
                ["closed", "Lock permanently"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={busy !== null}
                onClick={() => onPatch({ status: value }, `Status → ${value}`)}
                className={`btn btn-sm ${event.status === value ? "btn-primary" : "btn-ghost"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-white">Event timeline</h3>
        <ol className="mt-5 space-y-4">
          {steps.map((s) => (
            <li key={s.label} className="flex gap-3">
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-400/40 bg-violet-500/15 text-[0.65rem] text-violet-200">
                ●
              </span>
              <div>
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-slate-400">{formatDateTime(s.at)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-slate-400">
          Created {formatDateTime(event.createdAt)} · last updated{" "}
          {formatDateTime(event.updatedAt)}
        </div>
      </Card>
    </div>
  );
}
