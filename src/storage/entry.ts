import type { PendingEntry, PendingKey, StatsKind } from "./types";

const KEY_SEP = "\u0001";

export function joinKeyParts(...parts: string[]): string {
  return parts.join(KEY_SEP);
}

export function splitKeyParts(key: string): string[] {
  return key.split(KEY_SEP);
}

export function toPendingKey(entry: Omit<PendingEntry, "by">): PendingKey {
  return joinKeyParts(entry.kind, entry.packageName, entry.version, entry.periodType, entry.periodValue);
}

export function fromPendingKey(key: PendingKey, by: number): PendingEntry {
  const [kind, packageName, version, periodType, periodValue] = splitKeyParts(key);

  return {
    kind: kind as StatsKind,
    packageName,
    version,
    periodType: periodType as PendingEntry["periodType"],
    periodValue: periodValue as PendingEntry["periodValue"],
    by,
  };
}
