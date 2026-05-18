import type { SavedClassification, SavedRoadmap } from "@/types";

const KEYS = {
  classifications: "careerai_classifications",
  roadmaps: "careerai_roadmaps",
} as const;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function saveClassification(
  data: Omit<SavedClassification, "id" | "savedAt">
): SavedClassification {
  const record: SavedClassification = { ...data, id: uid(), savedAt: Date.now() };
  const existing = read<SavedClassification>(KEYS.classifications);
  write(KEYS.classifications, [record, ...existing].slice(0, 50));
  return record;
}

export function getClassifications(): SavedClassification[] {
  return read<SavedClassification>(KEYS.classifications);
}

export function deleteClassification(id: string): void {
  write(
    KEYS.classifications,
    read<SavedClassification>(KEYS.classifications).filter((r) => r.id !== id)
  );
}

export function saveRoadmap(
  data: Omit<SavedRoadmap, "id" | "savedAt">
): SavedRoadmap {
  const record: SavedRoadmap = { ...data, id: uid(), savedAt: Date.now() };
  const existing = read<SavedRoadmap>(KEYS.roadmaps);
  write(KEYS.roadmaps, [record, ...existing].slice(0, 50));
  return record;
}

export function getRoadmaps(): SavedRoadmap[] {
  return read<SavedRoadmap>(KEYS.roadmaps);
}

export function deleteRoadmap(id: string): void {
  write(
    KEYS.roadmaps,
    read<SavedRoadmap>(KEYS.roadmaps).filter((r) => r.id !== id)
  );
}

export function updateRoadmapMilestones(id: string, completed: number[]): void {
  const all = read<SavedRoadmap>(KEYS.roadmaps);
  write(
    KEYS.roadmaps,
    all.map((r) => (r.id === id ? { ...r, completedMilestones: completed } : r))
  );
}
