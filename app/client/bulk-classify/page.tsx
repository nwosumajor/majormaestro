import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import BulkClassifyClient from "./BulkClassifyClient";

export const dynamic = "force-dynamic";

export default async function BulkClassifyPage() {
  const me = await getClientUserFromCookies();
  if (!me) {
    redirect(`/client/signin?next=${encodeURIComponent("/client/bulk-classify")}`);
  }
  return <BulkClassifyClient />;
}
