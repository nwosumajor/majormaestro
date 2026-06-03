import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export default async function BatchResultsPage({ params }: { params: Promise<{ batchId: string }> }) {
  const me = await getClientUserFromCookies();
  const { batchId } = await params;
  if (!me) {
    redirect(`/client/signin?next=${encodeURIComponent(`/client/bulk-classify/${batchId}`)}`);
  }
  return <ResultsClient batchId={batchId} />;
}
