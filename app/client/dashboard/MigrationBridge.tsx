"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { migrateLocalStorageToServer } from "@/lib/clientStorage";

export default function MigrationBridge() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { classificationsPushed, roadmapsPushed } = await migrateLocalStorageToServer();
        if (cancelled) return;
        if (classificationsPushed > 0 || roadmapsPushed > 0) {
          const parts: string[] = [];
          if (classificationsPushed > 0) parts.push(`${classificationsPushed} classification${classificationsPushed === 1 ? "" : "s"}`);
          if (roadmapsPushed > 0) parts.push(`${roadmapsPushed} roadmap${roadmapsPushed === 1 ? "" : "s"}`);
          setMessage(`Imported ${parts.join(" and ")} from this device into your account.`);
          // Refresh the server-rendered list
          router.refresh();
          setTimeout(() => { if (!cancelled) setMessage(null); }, 6000);
        }
      } catch {
        /* silent — migration is best-effort */
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span className="font-semibold">Imported.</span> {message}
    </div>
  );
}
