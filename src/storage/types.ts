import { PeriodType, PeriodValue } from "../types";

export type StatsKind = "download" | "manifest";

export type PendingKey = string;

export interface EntryTarget {
  packageName: string;
  version: string;
}

export interface PendingEntry {
  kind: StatsKind;
  packageName: string;
  version: string;
  periodType: PeriodType;
  periodValue: PeriodValue;
  by: number;
}

export interface PeriodIncrement {
  periodType: PeriodType;
  periodValue: PeriodValue;
  by: number;
}

export interface GroupedEntry {
  packageName: string;
  version: string;
  download: Map<string, PeriodIncrement>;
  manifest: Map<string, PeriodIncrement>;
}

export type PeriodPair = Pick<PeriodIncrement, "periodType" | "periodValue">;
