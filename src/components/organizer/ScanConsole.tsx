"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Card, Chip, LiveDot, StatTile, Toast } from "@/components/ui";
import { usePoll } from "@/hooks/usePoll";
import type { EventRow, EventStats } from "@/lib/types";
import { countdownFrom, extractTicketCode, formatDateTime } from "@/lib/format";

type Outcome = {
  result: "check_in" | "duplicate" | "rejected" | "not_found" | "undo";
  message: string;
  tone: "success" | "warn" | "danger";
  ticket?: {
    ticketCode: string;
    fullName: string;
    type: string;
    status: string;
    category: string;
    guestLabel: string;
    checkedInAt: string | null;
  };
};

type SessionEntry = Outcome & { at: string };

export default function ScanConsole({ event }: { event: EventRow }) {
  const slug = event.slug;
  const { data, refresh } = usePoll<{ event: EventRow; stats: EventStats }>(
    `/api/events/${slug}?scope=public`,
    { interval: 5000 },
  );
  const stats = data?.stats;

  const [manual, setManual] = useState("");
  const [mode, setMode] = useState<"checkin" | "undo">("checkin");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const cooldown = useRef(0);

  const beep = useCallback((good: boolean) => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = good ? 880 : 220;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
      window.setTimeout(() => void ctx.close(), 400);
    } catch {
      /* audio is optional */
    }
  }, []);

  const submitCode = useCallback(
    async (raw: string) => {
      const code = extractTicketCode(raw);
      if (!code || submitting) return;
      if (Date.now() - cooldown.current < 1200) return;
      cooldown.current = Date.now();
      setSubmitting(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, slug, mode, scannedBy: "organizer-console" }),
        });
        const out = await res.json();
        if (!res.ok || out?.ok === false) {
          const bad: Outcome = {
            result: "rejected",
            tone: "danger",
            message: out?.error ?? "Scan failed.",
          };
          setOutcome(bad);
          setSession((prev) => [{ ...bad, at: new Date().toISOString() }, ...prev].slice(0, 25));
          beep(false);
          return;
        }
        const received = out.outcome as Outcome;
        setOutcome(received);
        setSession((prev) => [{ ...received, at: new Date().toISOString() }, ...prev].slice(0, 25));
        beep(received.tone === "success");
        await refresh();
      } finally {
        setSubmitting(false);
      }
    },
    [beep, mode, refresh, slug, submitting],
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);

      const tick = () => {
        const v = videoRef.current;
        const canvas = canvasRef.current;
        if (v && canvas && v.readyState >= 2 && v.videoWidth > 0) {
          const w = v.videoWidth;
          const h = v.videoHeight;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, w, h);
            const frame = ctx.getImageData(0, 0, w, h);
            const found = jsQR(frame.data, w, h, { inversionAttempts: "dontInvert" });
            if (found?.data) {
              const code = extractTicketCode(found.data);
              if (
                code &&
                (code !== lastScan.current.code ||
                  Date.now() - lastScan.current.at > 4000)
              ) {
                lastScan.current = { code, at: Date.now() };
                void submitCode(code);
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        "Camera unavailable or permission denied. Use manual code entry below.",
      );
      setCameraOn(false);
    }
  }, [submitCode]);

  useEffect(() => stopCamera, [stopCamera]);

  const deadline = countdownFrom(event.registrationDeadline);

  return (
    <div className="space-y-6">
      <Card strong className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="emerald">qr gate console</Chip>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <LiveDot live={Boolean(data)} /> live counters
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {event.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Scan participant and guest tickets · deadline{" "}
              {formatDateTime(event.registrationDeadline)} ({deadline.label})
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/organizer/${slug}`} className="btn btn-ghost btn-sm">
              ← Dashboard
            </Link>
            <Link href={`/organizer/${slug}/scan?mode=manual`} className="btn btn-ghost btn-sm">
              ⌨️ Manual mode
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Checked in"
          value={stats?.checkedIn ?? "—"}
          hint={`${stats?.scanRate ?? 0}% of confirmed`}
          accent="emerald"
          icon="✅"
        />
        <StatTile
          label="Confirmed seats"
          value={stats ? `${stats.participantCapacity - stats.spotsLeft}/${stats.participantCapacity}` : "—"}
          accent="cyan"
          icon="🎟️"
        />
        <StatTile
          label="Guests in"
          value={stats?.guests ? `${stats.guests} reg.` : "0"}
          hint={`${stats?.guestCapacity ?? 0} guest quota`}
          accent="violet"
          icon="🧑‍🤝‍🧑"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card strong className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Camera scanner</h3>
            <button
              type="button"
              onClick={() => (cameraOn ? stopCamera() : void startCamera())}
              className={`btn btn-sm ${cameraOn ? "btn-danger" : "btn-primary"}`}
            >
              {cameraOn ? "⏹ Stop camera" : "▶ Start camera"}
            </button>
          </div>

          <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/12 bg-black/60">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraOn ? (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div>
                  <p className="text-4xl">📷</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Start the camera and point it at a participant&apos;s QR
                    ticket.
                  </p>
                  {cameraError ? (
                    <p className="mt-2 text-xs text-amber-300">{cameraError}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-x-8 inset-y-10 rounded-2xl border-2 border-emerald-400/70" />
                <div className="pointer-events-none absolute inset-x-10 h-0.5 animate-[sweep_2.4s_linear_infinite] bg-emerald-300/90 shadow-[0_0_18px_rgba(16,185,129,0.9)]" />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Scan action</span>
            <button
              type="button"
              onClick={() => setMode("checkin")}
              className={`btn btn-sm ${mode === "checkin" ? "btn-primary" : "btn-ghost"}`}
            >
              ✅ Check in
            </button>
            <button
              type="button"
              onClick={() => setMode("undo")}
              className={`btn btn-sm ${mode === "undo" ? "btn-primary" : "btn-ghost"}`}
            >
              ↩️ Undo check-in
            </button>
          </div>

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode(manual);
              setManual("");
            }}
          >
            <input
              className="input font-mono"
              placeholder="Manual entry — e.g. TCK-4KP2XR"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" className="btn btn-ghost" disabled={submitting}>
              {submitting ? "Validating…" : "Validate"}
            </button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card strong className="p-5">
            <h3 className="font-semibold text-white">Last scan</h3>
            <div className="mt-4">
              {outcome ? (
                <Toast
                  tone={outcome.tone}
                  title={outcome.message}
                  body={`${outcome.result.replace("_", " ")}${
                    outcome.ticket ? ` · ${outcome.ticket.ticketCode}` : ""
                  }`}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center text-sm text-slate-400">
                  Waiting for the first scan…
                </p>
              )}
            </div>
            {outcome?.ticket ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Name" value={outcome.ticket.fullName} />
                <Field label="Ticket" value={outcome.ticket.ticketCode} mono />
                <Field
                  label="Type"
                  value={
                    outcome.ticket.type === "guest"
                      ? `Guest · ${outcome.ticket.guestLabel || "guest"}`
                      : outcome.ticket.category
                  }
                />
                <Field
                  label="Checked in at"
                  value={outcome.ticket.checkedInAt ? formatDateTime(outcome.ticket.checkedInAt) : "—"}
                />
              </dl>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">This session</h3>
              <span className="text-xs text-slate-500">{session.length} scans</span>
            </div>
            {session.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No scans in this session yet.</p>
            ) : (
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {session.map((entry, i) => (
                  <li
                    key={`${entry.at}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="truncate text-slate-200">
                      {entry.ticket?.fullName ?? "Unknown ticket"}
                      {entry.ticket ? (
                        <span className="ml-2 font-mono text-xs text-slate-400">
                          {entry.ticket.ticketCode}
                        </span>
                      ) : null}
                    </span>
                    <Chip
                      tone={
                        entry.result === "check_in"
                          ? "emerald"
                          : entry.result === "duplicate" || entry.result === "undo"
                            ? "amber"
                            : "rose"
                      }
                    >
                      {entry.result.replace("_", " ")}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}


