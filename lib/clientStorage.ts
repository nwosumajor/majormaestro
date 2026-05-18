import type { SavedClassification, SavedRoadmap } from "@/types";
import {
  saveClassification as lsSaveClassification,
  getClassifications as lsGetClassifications,
  deleteClassification as lsDeleteClassification,
  saveRoadmap as lsSaveRoadmap,
  getRoadmaps as lsGetRoadmaps,
  deleteRoadmap as lsDeleteRoadmap,
  updateRoadmapMilestones as lsUpdateRoadmapMilestones,
} from "@/lib/storage";

// ─── Sign-in detection ───────────────────────────────────────────────────

let cachedSignedIn: boolean | null = null;

async function isSignedIn(): Promise<boolean> {
  if (cachedSignedIn !== null) return cachedSignedIn;
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/client/me", { cache: "no-store" });
    cachedSignedIn = res.ok;
  } catch {
    cachedSignedIn = false;
  }
  return cachedSignedIn;
}

export function invalidateSignInCache(): void {
  cachedSignedIn = null;
}

// ─── Server payload shapes ───────────────────────────────────────────────

interface ServerSavedClassification {
  id: string;
  label: string;
  input: SavedClassification["input"];
  results: SavedClassification["results"];
  createdAt: string;
}

interface ServerSavedRoadmap {
  id: string;
  label: string;
  input: SavedRoadmap["input"];
  results: SavedRoadmap["results"];
  completedMilestones: number[];
  createdAt: string;
}

function toClassification(s: ServerSavedClassification): SavedClassification {
  return {
    id: s.id,
    savedAt: new Date(s.createdAt).getTime(),
    label: s.label,
    input: s.input,
    results: s.results,
  };
}

function toRoadmap(s: ServerSavedRoadmap): SavedRoadmap {
  return {
    id: s.id,
    savedAt: new Date(s.createdAt).getTime(),
    label: s.label,
    input: s.input,
    results: s.results,
    completedMilestones: s.completedMilestones,
  };
}

// ─── Classifications ─────────────────────────────────────────────────────

export async function saveClassificationSmart(
  data: Omit<SavedClassification, "id" | "savedAt">
): Promise<SavedClassification> {
  if (await isSignedIn()) {
    try {
      const res = await fetch("/api/account/classifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: data.label, input: data.input, results: data.results }),
      });
      if (res.ok) return toClassification(await res.json());
      if (res.status === 401) cachedSignedIn = false;
    } catch {
      /* fall through to localStorage */
    }
  }
  return lsSaveClassification(data);
}

export async function listClassificationsSmart(): Promise<SavedClassification[]> {
  const local = lsGetClassifications();
  if (await isSignedIn()) {
    try {
      const res = await fetch("/api/account/classifications", { cache: "no-store" });
      if (res.ok) {
        const { items } = (await res.json()) as { items: ServerSavedClassification[] };
        const server = items.map(toClassification);
        // Server is source of truth when signed in. Merge in any localStorage items
        // by label that haven't yet been synced (the migrate function pushes these).
        const seenLabels = new Set(server.map((s) => s.label));
        const unsyncedLocal = local.filter((l) => !seenLabels.has(l.label));
        return [...server, ...unsyncedLocal].sort((a, b) => b.savedAt - a.savedAt);
      }
    } catch {
      /* fall through */
    }
  }
  return local;
}

export async function deleteClassificationSmart(id: string): Promise<void> {
  if (await isSignedIn()) {
    try {
      const res = await fetch(`/api/account/classifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) return;
    } catch {
      /* fall through */
    }
  }
  lsDeleteClassification(id);
}

// ─── Roadmaps ────────────────────────────────────────────────────────────

export async function saveRoadmapSmart(
  data: Omit<SavedRoadmap, "id" | "savedAt">
): Promise<SavedRoadmap> {
  if (await isSignedIn()) {
    try {
      const res = await fetch("/api/account/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.label,
          input: data.input,
          results: data.results,
          completedMilestones: data.completedMilestones,
        }),
      });
      if (res.ok) return toRoadmap(await res.json());
      if (res.status === 401) cachedSignedIn = false;
    } catch {
      /* fall through to localStorage */
    }
  }
  return lsSaveRoadmap(data);
}

export async function listRoadmapsSmart(): Promise<SavedRoadmap[]> {
  const local = lsGetRoadmaps();
  if (await isSignedIn()) {
    try {
      const res = await fetch("/api/account/roadmaps", { cache: "no-store" });
      if (res.ok) {
        const { items } = (await res.json()) as { items: ServerSavedRoadmap[] };
        const server = items.map(toRoadmap);
        const seenLabels = new Set(server.map((s) => s.label));
        const unsyncedLocal = local.filter((l) => !seenLabels.has(l.label));
        return [...server, ...unsyncedLocal].sort((a, b) => b.savedAt - a.savedAt);
      }
    } catch {
      /* fall through */
    }
  }
  return local;
}

export async function deleteRoadmapSmart(id: string): Promise<void> {
  if (await isSignedIn()) {
    try {
      const res = await fetch(`/api/account/roadmaps?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) return;
    } catch {
      /* fall through */
    }
  }
  lsDeleteRoadmap(id);
}

export async function updateRoadmapMilestonesSmart(id: string, completed: number[]): Promise<void> {
  if (await isSignedIn()) {
    try {
      const res = await fetch("/api/account/roadmaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completedMilestones: completed }),
      });
      if (res.ok) return;
    } catch {
      /* fall through */
    }
  }
  lsUpdateRoadmapMilestones(id, completed);
}

// ─── Migrate localStorage entries to the server (one-shot) ──────────────

interface MigrateResult {
  classificationsPushed: number;
  roadmapsPushed: number;
}

const MIGRATED_FLAG_KEY = "careerai_migrated_to_server_v1";

export async function migrateLocalStorageToServer(): Promise<MigrateResult> {
  if (typeof window === "undefined") return { classificationsPushed: 0, roadmapsPushed: 0 };
  if (localStorage.getItem(MIGRATED_FLAG_KEY) === "1") return { classificationsPushed: 0, roadmapsPushed: 0 };
  if (!(await isSignedIn())) return { classificationsPushed: 0, roadmapsPushed: 0 };

  const classifications = lsGetClassifications();
  const roadmaps = lsGetRoadmaps();
  if (classifications.length === 0 && roadmaps.length === 0) {
    localStorage.setItem(MIGRATED_FLAG_KEY, "1");
    return { classificationsPushed: 0, roadmapsPushed: 0 };
  }

  let classificationsPushed = 0;
  let roadmapsPushed = 0;

  for (const c of classifications) {
    try {
      const res = await fetch("/api/account/classifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: c.label, input: c.input, results: c.results }),
      });
      if (res.ok) classificationsPushed++;
    } catch {
      /* keep going */
    }
  }

  for (const r of roadmaps) {
    try {
      const res = await fetch("/api/account/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: r.label,
          input: r.input,
          results: r.results,
          completedMilestones: r.completedMilestones,
        }),
      });
      if (res.ok) roadmapsPushed++;
    } catch {
      /* keep going */
    }
  }

  // Clear local storage so we don't show duplicates. Only clear what we pushed —
  // if anything failed, leave it locally to retry on next sign-in.
  if (classificationsPushed === classifications.length && roadmapsPushed === roadmaps.length) {
    localStorage.removeItem("careerai_classifications");
    localStorage.removeItem("careerai_roadmaps");
  }
  localStorage.setItem(MIGRATED_FLAG_KEY, "1");

  return { classificationsPushed, roadmapsPushed };
}
