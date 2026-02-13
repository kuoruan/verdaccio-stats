import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConfigHolder } from "@/config";
import { PERIOD_TYPES, UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "@/constants";
import { DownloadStats, ManifestViewStats, Package } from "@/models";
import { Database } from "@/storage/db";

function createTestConfig(): ConfigHolder {
  return {
    countDownloads: true,
    countManifestViews: true,
    favicon: "",
    isoWeek: false,
    logo: undefined,
    sequelizeOptions: {
      dialect: "sqlite",
      storage: ":memory:",
    },
    title: "test",
  } as unknown as ConfigHolder;
}

describe.sequential("Database", () => {
  let db: Database;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-02T03:04:05.000Z"));

    db = new Database(createTestConfig());
    await db.authenticate();
    await db.migrate();
  });

  afterEach(async () => {
    await db.close();
    vi.useRealTimers();
  });

  it("migrate() should create tables and seed universe package", async () => {
    const universe = await Package.findOne({
      where: { name: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
    });

    expect(universe).not.toBeNull();
    expect(await Package.count()).toBe(1);
  });

  it("addDownloadCount() should write stats rows and increment on repeated calls", async () => {
    await db.addDownloadCount("foo", "1.0.0");

    expect(await Package.count()).toBe(3);
    expect(await DownloadStats.count()).toBe(3 * PERIOD_TYPES.length);

    expect(await DownloadStats.min("count")).toBe(1);
    expect(await DownloadStats.max("count")).toBe(1);

    await db.addDownloadCount("foo", "1.0.0");

    expect(await DownloadStats.count()).toBe(3 * PERIOD_TYPES.length);
    expect(await DownloadStats.min("count")).toBe(2);
    expect(await DownloadStats.max("count")).toBe(2);

    expect(await DownloadStats.sum("count")).toBe(2 * 3 * PERIOD_TYPES.length);
  });

  it("addManifestViewCount() should support optional version and write expected rows", async () => {
    await db.addManifestViewCount("foo");

    expect(await Package.count()).toBe(2);
    expect(
      await Package.findOne({
        where: { name: "foo", version: "1.0.0" },
      }),
    ).toBeNull();

    expect(await ManifestViewStats.count()).toBe(2 * PERIOD_TYPES.length);
    expect(await ManifestViewStats.sum("count")).toBe(2 * PERIOD_TYPES.length);

    await db.addManifestViewCount("foo", "1.0.0");

    expect(await Package.count()).toBe(3);
    expect(await ManifestViewStats.count()).toBe(3 * PERIOD_TYPES.length);

    // universe and foo@* incremented to 2, foo@1.0.0 created with 1
    expect(await ManifestViewStats.sum("count")).toBe(5 * PERIOD_TYPES.length);
  });
});
