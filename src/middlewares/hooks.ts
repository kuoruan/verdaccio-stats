import type { Application, Handler } from "express";

import { tarballUtils } from "@verdaccio/core";
import { PACKAGE_API_ENDPOINTS } from "@verdaccio/middleware";

import type { ConfigHolder } from "../config";
import type { PluginMiddleware } from "../types";

import logger from "../logger";
import { Database } from "../storage/db";
import { isSuccessStatus } from "../utils";

export class Hooks implements PluginMiddleware {
  private db: Database | null = null;

  constructor(private config: ConfigHolder) {}

  packageManifestHandler: Handler = (req, res, next) => {
    const db = this.db;

    if (!db) {
      logger.warn("DB instance is not ready; skipping manifest stats");

      return next();
    }

    const packageName = req.params.package;
    const version = req.params.version;

    if (packageName === "favicon.ico") {
      logger.debug("Skipping manifest stats for favicon request");

      return next();
    }

    res.once("finish", () => {
      if (!isSuccessStatus(res.statusCode)) {
        logger.debug("Skipping manifest stats for non-2xx response");

        return;
      }

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

  public setDatabase(db: Database) {
    this.db = db;
  }

  tarballDownloadHandler: Handler = (req, res, next) => {
    const db = this.db;

    if (!db) {
      logger.warn("DB instance is not ready; skipping download stats");

      return next();
    }

    // react
    const packageName = req.params.package;
    // react-18.0.0.tgz
    const filename = req.params.filename;

    res.once("finish", () => {
      if (!isSuccessStatus(res.statusCode)) {
        logger.debug("Skipping download stats for non-2xx response");
        return;
      }

      // react-18.0.0.tgz -> 18.0.0
      const version = tarballUtils.getVersionFromTarball(filename);

      if (!packageName || !version) {
        logger.warn("Unexpected missing package name or filename in request");
        return;
      }

      logger.debug({ packageName, version }, "Adding download stats for package @{packageName} version @{version}");

      db.addDownloadCount(packageName, version).catch((err) => {
        logger.error({ err }, "Failed to add download count; @{err}");
      });
    });

    return next();
  };
}
