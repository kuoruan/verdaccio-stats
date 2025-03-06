import type { Application, Handler } from "express";

import { PACKAGE_API_ENDPOINTS } from "@verdaccio/middleware";

import type { PluginMiddleware } from "./types";

import { ConfigHolder } from "./config";
import { DB } from "./db";
import logger from "./logger";
import { getPackageVersion, isSuccessStatus } from "./utils";

export class DownloadStats implements PluginMiddleware {
  private db: DB | null = null;

  constructor(private config: ConfigHolder) {
    void this.init();
  }

  packageManifestHandler: Handler = (req, res, next) => {
    const db = this.db;

    if (!db) {
      logger.warn("DB instance is not ready; skipping manifest stats");

      return next();
    }

    res.once("finish", () => {
      if (!isSuccessStatus(res.statusCode)) {
        logger.debug("Skipping manifest stats for non-2xx response");
        return;
      }

      const packageName = req.params.package;
      const version = req.params.version;

      if (!packageName) {
        logger.warn("Unexpected missing package name in request");
        return;
      }

      logger.debug(
        { packageName, version },
        "Adding manifest view stats for package @{packageName} version @{version}",
      );

      db.addManifestViewCount(packageName, version).catch((err) => {
        logger.error({ err }, "Failed to add manifest count; @{err}");
      });
    });

    return next();
  };

  register_middlewares(app: Application) {
    if (this.config.countDownloads) {
      app.get(PACKAGE_API_ENDPOINTS.get_package_tarball, this.tarballDownloadHandler);
    }

    if (this.config.countManifestViews) {
      app.get(PACKAGE_API_ENDPOINTS.get_package_by_version, this.packageManifestHandler);
    }
  }

  tarballDownloadHandler: Handler = (req, res, next) => {
    const db = this.db;

    if (!db) {
      logger.warn("DB instance is not ready; skipping download stats");

      return next();
    }

    res.once("finish", () => {
      if (!isSuccessStatus(res.statusCode)) {
        logger.debug("Skipping download stats for non-2xx response");
        return;
      }

      // react
      const packageName = req.params.package;
      // react-18.0.0.tgz
      const filename = req.params.filename;

      // react-18.0.0.tgz -> 18.0.0
      const version = getPackageVersion(filename, packageName);

      if (!packageName || !version) {
        logger.warn("Unexpected missing package name or version in request");
        return;
      }

      logger.debug({ packageName, version }, "Adding download stats for package @{packageName} version @{version}");

      db.addDownloadCount(packageName, version).catch((err) => {
        logger.error({ err }, "Failed to add download count; @{err}");
      });
    });

    return next();
  };

  private async init() {
    try {
      this.db = await DB.create(this.config);
    } catch (err) {
      logger.error({ err }, "Failed to create DB instance; @{err}");
      process.exit(1);
    }
  }
}
