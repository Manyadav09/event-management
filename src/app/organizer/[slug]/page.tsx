import { notFound } from "next/navigation";
import OrganizerDashboard from "@/components/organizer/OrganizerDashboard";
import { getLiveSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await getLiveSnapshot(slug);
  if (!snapshot) notFound();
  return <OrganizerDashboard initial={snapshot} />;
}
