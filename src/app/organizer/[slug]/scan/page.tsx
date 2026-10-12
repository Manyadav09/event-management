import { notFound } from "next/navigation";
import ScanConsole from "@/components/organizer/ScanConsole";
import { getEventBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  return <ScanConsole event={event} />;
}
