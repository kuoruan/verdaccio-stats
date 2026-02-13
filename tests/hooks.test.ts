/* eslint-disable unicorn/no-useless-undefined */
import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConfigHolder } from "../src/config";
import { Hooks } from "../src/middlewares/hooks";

const verdaccioCoreMocks = vi.hoisted(() => ({
  getVersionFromTarball: vi.fn(),
}));

vi.mock("@verdaccio/core", () => ({
  tarballUtils: {
    getVersionFromTarball: verdaccioCoreMocks.getVersionFromTarball,
  },
}));

interface FakeReq {
  params: Record<string, any>;
}

type FakeRes = EventEmitter & {
  statusCode: number;
};

function createRes(statusCode = 200): FakeRes {
  // eslint-disable-next-line unicorn/prefer-event-target
  const res = new EventEmitter() as FakeRes;
  res.statusCode = statusCode;
  return res;
}

function createConfig(overrides: Partial<ConfigHolder> = {}): ConfigHolder {
  return {
    countDownloads: true,
    countManifestViews: true,
    favicon: "",
    flushInterval: 0,
    isoWeek: false,
    logo: undefined,
    maxPendingEntries: 10_000,
    sequelizeOptions: {} as any,
    title: "test",
    ...overrides,
  } as ConfigHolder;
}

describe("Hooks", () => {
  beforeEach(() => {
    verdaccioCoreMocks.getVersionFromTarball.mockReset();
  });

  it("tarballDownloadHandler should call addDownloadCount on success", () => {
    verdaccioCoreMocks.getVersionFromTarball.mockReturnValue("1.2.3");

    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { package: "react", filename: "react-1.2.3.tgz" },
    };
    const res = createRes(200);
    const next = vi.fn();

    hooks.tarballDownloadHandler(req as any, res as any, next);
    expect(next).toHaveBeenCalledOnce();

    res.emit("finish");

    expect(db.addDownloadCount).toHaveBeenCalledWith("react", "1.2.3");
  });

  it("tarballDownloadHandler should add scope and skip on non-success status", () => {
    verdaccioCoreMocks.getVersionFromTarball.mockReturnValue("1.2.3");

    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { scope: "vitejs", package: "plugin-vue", filename: "plugin-vue-1.2.3.tgz" },
    };
    const res = createRes(404);

    hooks.tarballDownloadHandler(req as any, res as any, () => {
      // ignore
    });
    res.emit("finish");

    expect(db.addDownloadCount).not.toHaveBeenCalled();
  });

  it("tarballDownloadHandler should skip when package or version missing", () => {
    verdaccioCoreMocks.getVersionFromTarball.mockReturnValue(undefined);

    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { package: "react", filename: "react-unknown.tgz" },
    };
    const res = createRes(200);

    hooks.tarballDownloadHandler(req as any, res as any, () => {
      // ignore
    });
    res.emit("finish");

    expect(db.addDownloadCount).not.toHaveBeenCalled();
  });

  it("packageManifestHandler should skip favicon.ico", () => {
    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { package: "favicon.ico" },
    };
    const res = createRes(200);
    const next = vi.fn();

    hooks.packageManifestHandler(req as any, res as any, next);
    expect(next).toHaveBeenCalledOnce();

    res.emit("finish");
    expect(db.addManifestViewCount).not.toHaveBeenCalled();
  });

  it("packageManifestHandler should call addManifestViewCount on success", () => {
    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { scope: "vitejs", package: "plugin-vue", version: "2.0.0" },
    };
    const res = createRes(200);

    hooks.packageManifestHandler(req as any, res as any, () => {
      // ignore
    });
    res.emit("finish");

    expect(db.addManifestViewCount).toHaveBeenCalledWith("@vitejs/plugin-vue", "2.0.0");
  });

  it("packageManifestHandler should skip on non-success status", () => {
    const db = {
      addDownloadCount: vi.fn().mockResolvedValue(undefined),
      addManifestViewCount: vi.fn().mockResolvedValue(undefined),
    } as any;

    const hooks = new Hooks(createConfig(), db);

    const req: FakeReq = {
      params: { package: "foo", version: "1.0.0" },
    };
    const res = createRes(500);

    hooks.packageManifestHandler(req as any, res as any, () => {
      // ignore
    });
    res.emit("finish");

    expect(db.addManifestViewCount).not.toHaveBeenCalled();
  });
});
