import dayjs, { type Dayjs, extend } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekYear from "dayjs/plugin/weekYear";
import path from "node:path";

import type { PeriodType, PeriodValue } from "./types";

import { API_BASE_PATH, PERIOD_VALUE_TOTAL } from "./constants";

extend(advancedFormat);
extend(weekYear);
extend(weekOfYear);
extend(isoWeek);

/**
 * Add a scope to the package name.
 *
 * @param scope {string} - The scope to add.
 * @param packageName {string} - The package name.
 * @returns {string} The scoped package name.
 */
export function addScope(scope: string, packageName: string): string {
  return `@${scope}/${packageName}`;
}

export function getCurrentPeriodValue(periodType: PeriodType, isoWeek?: boolean): PeriodValue {
  return getPeriodValue(periodType, undefined, isoWeek);
}

/**
 * Get the period value for the given period type.
 *
 * @param periodType {PeriodType} - The period type.
 * @param date {Dayjs} - The date to get the period value for.
 * @param isoWeek {boolean} - Whether to use ISO week format.
 * @returns {PeriodValue} The period value.
 */
export function getPeriodValue(periodType: PeriodType, date?: Dayjs, isoWeek?: boolean): PeriodValue {
  switch (periodType) {
    case "daily": {
      return dayjs(date).format("YYYY-MM-DD");
    }
    case "monthly": {
      return dayjs(date).format("YYYY-MM");
    }
    case "overall": {
      return PERIOD_VALUE_TOTAL;
    }
    case "weekly": {
      return dayjs(date).format(isoWeek ? "GGGG-[W]WW" : "gggg-[W]ww");
    }
    case "yearly": {
      return dayjs(date).format("YYYY");
    }
    default: {
      throw new Error(`Unknown period type: ${String(periodType)}`);
    }
  }
}

/**
 * Check if the status code is a success status code.
 *
 * @param statusCode {number} - The status code.
 * @returns {boolean} Whether the status code is a success status code.
 */
export function isSuccessStatus(statusCode: number): boolean {
  return (statusCode >= 200 && statusCode < 300) || statusCode === 304;
}

/**
 * Get the absolute path of a file path.
 *
 * @param configPath {string} - The path to the config file.
 * @param targetPath {string} - The path to the files.
 * @returns {string} The absolute path of the file.
 */
export function normalizeFilePath(configPath: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.normalize(path.join(path.dirname(configPath), targetPath));
}

/**
 * Wraps the given URL path for Verdaccio stats.
 *
 * @param urlPath {string} - The path to be wrapped.
 * @returns {string} The wrapped path.
 */
export function wrapPath(urlPath: string) {
  return `${API_BASE_PATH}${urlPath}`;
}
