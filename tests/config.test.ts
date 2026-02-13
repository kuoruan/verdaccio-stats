import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ParsedPluginConfig } from "../src/config";
import { DEFAULT_SQLITE_STORAGE } from "../src/constants";

function createVerdaccioConfig(configPath: string, title?: string): any {
  return {
    configPath,
    self_path: configPath,
    web: title ? { title } : undefined,
  };
}

describe("ParsedPluginConfig", () => {
  it("should provide sane defaults (sqlite, counts enabled)", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml", "My Verdaccio");
    const parsed = new ParsedPluginConfig({} as any, verdaccioConfig);

    expect(parsed.countDownloads).toBe(true);
    expect(parsed.countManifestViews).toBe(true);
    expect(parsed.isoWeek).toBe(false);
    expect(parsed.flushInterval).toBe(5000);
    expect(parsed.maxPendingEntries).toBe(10_000);

    const opts = parsed.sequelizeOptions as any;
    expect(opts.dialect).toBe("sqlite");
    expect(opts.storage).toBe(path.normalize("/tmp/verdaccio/" + DEFAULT_SQLITE_STORAGE));

    expect(parsed.title).toBe("My Verdaccio - Stats");
  });

  it("should exit(1) for invalid sqlite storage path", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    try {
      expect(() => new ParsedPluginConfig({ dialect: "sqlite", database: "" } as any, verdaccioConfig)).toThrow(
        /process\.exit:1/,
      );
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("flush-interval should support number and ms string", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml");

    const parsed1 = new ParsedPluginConfig({ "flush-interval": 1234 } as any, verdaccioConfig);
    expect(parsed1.flushInterval).toBe(1234);

    const parsed2 = new ParsedPluginConfig({ "flush-interval": "2s" } as any, verdaccioConfig);
    expect(parsed2.flushInterval).toBe(2000);
  });

  it("should exit(1) for invalid flush-interval string", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    try {
      expect(() => new ParsedPluginConfig({ "flush-interval": "nope" } as any, verdaccioConfig)).toThrow(
        /process\.exit:1/,
      );
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("should exit(1) for non-sqlite dialect without required fields", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    try {
      expect(
        () =>
          new ParsedPluginConfig(
            {
              dialect: "mysql",
              database: { name: "db", username: "", password: "", host: "", port: 3306 },
            } as any,
            verdaccioConfig,
          ),
      ).toThrow(/process\.exit:1/);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("should read username/password defaults from env vars", () => {
    const verdaccioConfig = createVerdaccioConfig("/tmp/verdaccio/config.yaml");

    const prevUser = process.env.VERDACCIO_STATS_USERNAME;
    const prevPass = process.env.VERDACCIO_STATS_PASSWORD;

    process.env.VERDACCIO_STATS_USERNAME = "user";
    process.env.VERDACCIO_STATS_PASSWORD = "pass";

    try {
      const parsed = new ParsedPluginConfig(
        {
          dialect: "mysql",
          database: { name: "db" },
        } as any,
        verdaccioConfig,
      );

      const opts = parsed.sequelizeOptions as any;
      expect(opts.username).toBe("user");
      expect(opts.password).toBe("pass");
      expect(opts.database).toBe("db");
    } finally {
      if (prevUser === undefined) {
        delete process.env.VERDACCIO_STATS_USERNAME;
      } else {
        process.env.VERDACCIO_STATS_USERNAME = prevUser;
      }

      if (prevPass === undefined) {
        delete process.env.VERDACCIO_STATS_PASSWORD;
      } else {
        process.env.VERDACCIO_STATS_PASSWORD = prevPass;
      }
    }
  });
});
