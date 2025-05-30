import path from "node:path";

import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { PERIOD_VALUE_TOTAL } from "../src/constants";
import { getPeriodValue, normalizeFilePath } from "../src/utils";

describe("getPeriodValue", () => {
  const testDate = dayjs("2023-05-15");

  it("should return daily period value", () => {
    expect(getPeriodValue("daily", testDate)).toBe("2023-05-15");
  });

  it("should return monthly period value", () => {
    expect(getPeriodValue("monthly", testDate)).toBe("2023-05");
  });

  it("should return yearly period value", () => {
    expect(getPeriodValue("yearly", testDate)).toBe("2023");
  });

  it("should return overall period value", () => {
    expect(getPeriodValue("overall", testDate)).toBe(PERIOD_VALUE_TOTAL);
  });

  it("should return weekly period value", () => {
    expect(getPeriodValue("weekly", testDate)).toBe("2023-W20");
    expect(getPeriodValue("weekly", testDate, true)).toBe("2023-W20");

    const newDate = dayjs("2023-12-31");
    expect(getPeriodValue("weekly", newDate)).toBe("2024-W01");
    expect(getPeriodValue("weekly", newDate, true)).toBe("2023-W52");
  });

  it("should throw error for invalid period type", () => {
    // @ts-expect-error Testing invalid type
    expect(() => getPeriodValue("invalid")).toThrow("Unknown period type: invalid");
  });
});

describe("normalizeFilePath", () => {
  it("should return absolute path unchanged", () => {
    const absPath = path.resolve("/absolute/path");
    expect(normalizeFilePath("/config/path", absPath)).toBe(absPath);
  });

  it("should resolve relative path", () => {
    expect(normalizeFilePath("/config/path", "./relative")).toBe(path.normalize("/config/relative"));
  });
});
