import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import TicketDashboard from "@/components/participant/TicketDashboard";
import { getRegistrationByCode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const snapshot = await getRegistrationByCode(decodeURIComponent(code).toUpperCase());
  if (!snapshot) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Ticket not found
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          We couldn&apos;t find a registration for{" "}
          <span className="font-mono text-slate-200">{code.toUpperCase()}</span>.
          Check the code in your confirmation, or register again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/events" className="btn btn-primary">
            Browse events
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    );
  }

  const qrDataUrl = await QRCode.toDataURL(snapshot.registration.ticketCode, {
    margin: 1,
    width: 420,
    color: { dark: "#0a0c1b", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return (
    <TicketDashboard
      initial={snapshot}
      qrDataUrl={qrDataUrl}
    />
  );
}
