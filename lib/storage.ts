import { useSyncExternalStore } from "react";
import { FilterMode } from "./types";

const SCHEMA_VERSION = 2;
const STORAGE_KEY = "housemap:v2";

interface StorageSchema {
  version: number;
  bookmarks: string[];           // districtIds
  filterPresets: FilterPreset[];
  compareA: string | null;
  compareB: string | null;
  lastVisited: string[];         // districtIds, max 10, most recent first
}

export interface FilterPreset {
  id: string;
  name: string;
  mode: FilterMode;
  createdAt: string;
}

const DEFAULTS: StorageSchema = {
  version: SCHEMA_VERSION,
  bookmarks: [],
  filterPresets: [],
  compareA: null,
  compareB: null,
  lastVisited: [],
};

function read(): StorageSchema {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as StorageSchema;
    if (parsed.version !== SCHEMA_VERSION) return DEFAULTS;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function write(data: StorageSchema): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    listeners.forEach((l) => l());
  } catch {
    // Storage full or unavailable -- silent fail
  }
}

// External store pattern for useSyncExternalStore
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): StorageSchema {
  return read();
}

function getServerSnapshot(): StorageSchema {
  return DEFAULTS;
}

export function useStorage(): StorageSchema {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Bookmarks ────────────────────────────────────────────────────────────────

export function addBookmark(districtId: string): void {
  const data = read();
  if (data.bookmarks.includes(districtId)) return;
  write({ ...data, bookmarks: [...data.bookmarks, districtId] });
}

export function removeBookmark(districtId: string): void {
  const data = read();
  write({ ...data, bookmarks: data.bookmarks.filter((b) => b !== districtId) });
}

export function isBookmarked(districtId: string): boolean {
  return read().bookmarks.includes(districtId);
}

export function useBookmarks(): string[] {
  const s = useStorage();
  return s.bookmarks;
}

// ── Filter Presets ────────────────────────────────────────────────────────────

export function saveFilterPreset(name: string, mode: FilterMode): FilterPreset {
  const data = read();
  const preset: FilterPreset = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    mode,
    createdAt: new Date().toISOString(),
  };
  write({ ...data, filterPresets: [...data.filterPresets, preset] });
  return preset;
}

export function deleteFilterPreset(id: string): void {
  const data = read();
  write({ ...data, filterPresets: data.filterPresets.filter((p) => p.id !== id) });
}

export function useFilterPresets(): FilterPreset[] {
  const s = useStorage();
  return s.filterPresets;
}

// ── Compare ──────────────────────────────────────────────────────────────────

export function setCompareSlot(slot: "a" | "b", districtId: string | null): void {
  const data = read();
  write({
    ...data,
    compareA: slot === "a" ? districtId : data.compareA,
    compareB: slot === "b" ? districtId : data.compareB,
  });
}

export function useCompare(): { a: string | null; b: string | null } {
  const s = useStorage();
  return { a: s.compareA, b: s.compareB };
}

// ── Last Visited ──────────────────────────────────────────────────────────────

export function recordVisit(districtId: string): void {
  const data = read();
  const filtered = data.lastVisited.filter((d) => d !== districtId);
  write({ ...data, lastVisited: [districtId, ...filtered].slice(0, 10) });
}

export function useLastVisited(): string[] {
  const s = useStorage();
  return s.lastVisited;
}
