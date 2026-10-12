"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, Chip } from "@/components/ui";
import { toLocalInput } from "@/lib/format";

export type EventFormDefaults = {
  slug?: string;
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  venue?: string;
  city?: string;
  organizerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  startsAt?: string;
  endsAt?: string;
  registrationDeadline?: string;
  capacity?: number;
  guestCapacity?: number;
  guestsPerRegistration?: number;
  allowGuests?: boolean;
  waitlistEnabled?: boolean;
  autoCloseWhenFull?: boolean;
  requireCheckIn?: boolean;
  status?: string;
};

const CATEGORIES = [
  "Conference",
  "Hackathon",
  "Workshop",
  "Cultural fest",
  "Sports meet",
  "Meetup",
  "Webinar",
  "Exhibition",
];

function plusHours(hours: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function EventSetupForm({
  mode = "create",
  slug,
  defaults,
}: {
  mode?: "create" | "edit";
  slug?: string;
  defaults?: EventFormDefaults;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: defaults?.name ?? "",
    tagline: defaults?.tagline ?? "",
    description: defaults?.description ?? "",
    category: defaults?.category ?? "Conference",
    venue: defaults?.venue ?? "",
    city: defaults?.city ?? "",
    organizerName: defaults?.organizerName ?? "",
    contactEmail: defaults?.contactEmail ?? "",
    contactPhone: defaults?.contactPhone ?? "",
    startsAt: defaults?.startsAt ?? plusHours(0),
    endsAt: defaults?.endsAt ?? plusHours(4),
    registrationDeadline: defaults?.registrationDeadline ?? plusHours(-48),
    capacity: defaults?.capacity ?? 150,
    guestCapacity: defaults?.guestCapacity ?? 25,
    guestsPerRegistration: defaults?.guestsPerRegistration ?? 2,
    allowGuests: defaults?.allowGuests ?? true,
    waitlistEnabled: defaults?.waitlistEnabled ?? true,
    autoCloseWhenFull: defaults?.autoCloseWhenFull ?? true,
    requireCheckIn: defaults?.requireCheckIn ?? true,
    status: defaults?.status ?? "published",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSeats = useMemo(
    () => (form.allowGuests ? Number(form.capacity) + Number(form.guestCapacity) : Number(form.capacity)),
    [form.allowGuests, form.capacity, form.guestCapacity],
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      const res = await fetch(
        mode === "edit" ? `/api/events/${slug}` : "/api/events",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        setError(data?.error ?? "Could not save the event.");
        return;
      }
      router.push(`/organizer/${data.event.slug}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card strong className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Chip tone="violet">step 1 · event details</Chip>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Fill the event information once
            </h2>
            <p className="text-sm text-slate-400">
              These details publish instantly to the public page and both
              dashboards.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {mode === "edit" ? "Editing existing event" : "Single submission"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Event name *</label>
            <input
              id="name"
              className="input"
              placeholder="Annual Tech Summit 2026"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tagline">Tagline</label>
            <input
              id="tagline"
              className="input"
              placeholder="Where builders meet the future"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="textarea min-h-24"
              placeholder="What happens at the event, who should join, agenda highlights…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select
              id="category"
              className="select"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="venue">Venue</label>
            <input
              id="venue"
              className="input"
              placeholder="Innovation Hall A"
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input
              id="city"
              className="input"
              placeholder="Bengaluru"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="organizerName">Organizer name</label>
            <input
              id="organizerName"
              className="input"
              placeholder="DevRel Collective"
              value={form.organizerName}
              onChange={(e) => set("organizerName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              className="input"
              placeholder="hello@event.dev"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="contactPhone">Contact phone</label>
            <input
              id="contactPhone"
              className="input"
              placeholder="+91 90000 00000"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <Chip tone="sky">step 2 · date, time & deadline</Chip>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Timeline controls
        </h2>
        <p className="text-sm text-slate-400">
          The deadline automatically closes registration — the countdown on
          every page is live.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="startsAt">Event starts *</label>
            <input
              id="startsAt"
              type="datetime-local"
              className="input"
              value={toLocalInput(form.startsAt)}
              onChange={(e) => set("startsAt", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="endsAt">Event ends *</label>
            <input
              id="endsAt"
              type="datetime-local"
              className="input"
              value={toLocalInput(form.endsAt)}
              onChange={(e) => set("endsAt", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="registrationDeadline">
              Registration deadline *
            </label>
            <input
              id="registrationDeadline"
              type="datetime-local"
              className="input"
              value={toLocalInput(form.registrationDeadline)}
              onChange={(e) => set("registrationDeadline", e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              After this moment the registration form locks itself.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <Chip tone="emerald">step 3 · capacity, guests & rules</Chip>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Seats, guest section & policies
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="capacity">Participant capacity *</label>
            <input
              id="capacity"
              type="number"
              min={1}
              className="input"
              value={form.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="guestCapacity">Guest capacity</label>
            <input
              id="guestCapacity"
              type="number"
              min={0}
              className="input"
              value={form.guestCapacity}
              onChange={(e) => set("guestCapacity", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="guestsPerRegistration">
              Guests per registration
            </label>
            <input
              id="guestsPerRegistration"
              type="number"
              min={0}
              max={10}
              className="input"
              value={form.guestsPerRegistration}
              onChange={(e) => set("guestsPerRegistration", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["allowGuests", "Guest section enabled", "Attendees can add guest passes."],
              ["waitlistEnabled", "Auto waitlist", "Overflow registrations wait instead of failing."],
              ["autoCloseWhenFull", "Close when full", "Lock the form once seats run out."],
              ["requireCheckIn", "QR check-in required", "Scan tickets at the entry gate."],
            ] as const
          ).map(([key, title, body]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-violet-500"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-white">{title}</span>
                <span className="block text-xs text-slate-400">{body}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
                Total seats
              </p>
              <p className="text-2xl font-semibold text-white">{totalSeats}</p>
            </div>
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">
                Publish state
              </p>
              <select
                className="select mt-1"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="published">Published — live</option>
                <option value="draft">Draft — hidden</option>
                <option value="closed">Closed — locked</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Publish event →"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </Card>
    </form>
  );
}
