import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">
        This page took a wrong turn
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        The event or ticket you are looking for does not exist, or registration
        has not been published yet.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/events" className="btn btn-primary">
          Browse events
        </Link>
        <Link href="/organize" className="btn btn-ghost">
          Organizer studio
        </Link>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
