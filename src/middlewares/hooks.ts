import type { Application, Handler } from "express";

import { tarballUtils } from "@verdaccio/core";
import {
  ROUTE_MANIFEST_VIEW,
  ROUTE_SCOPED_MANIFEST_VIEW,
  ROUTE_SCOPED_TARBALL_DOWNLOAD,
  ROUTE_TARBALL_DOWNLOAD,
} from "src/constants";

import type { ConfigHolder } from "../config";
import type { PluginMiddleware } from "../types";

import logger from "../logger";
import { Database } from "../storage/db";
import { addScope, isSuccessStatus } from "../utils";

export class Hooks implements PluginMiddleware {
  constructor(
    private config: ConfigHolder,
    private db: Database,
  ) {}

  packageManifestHandler: Handler = (req, res, next) => {
    const scope = req.params.scope;
    const packageName = scope ? addScope(scope, req.params.package) : req.params.package;
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

      this.db.addManifestViewCount(packageName, version).catch((err) => {
        logger.error({ err }, "Failed to add manifest count; @{err}");
      });
    });

    return next();
  };

  register_middlewares(app: Application) {
    if (this.config.countDownloads) {
      app.get([ROUTE_SCOPED_TARBALL_DOWNLOAD, ROUTE_TARBALL_DOWNLOAD], this.tarballDownloadHandler);
    }

    if (this.config.countManifestViews) {
      app.get([ROUTE_SCOPED_MANIFEST_VIEW, ROUTE_MANIFEST_VIEW], this.packageManifestHandler);
    }
  }

  tarballDownloadHandler: Handler = (req, res, next) => {
    const scope = req.params.scope;

    // react / @vitejs/plugin-react
    const packageName = scope ? addScope(scope, req.params.package) : req.params.package;
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

      this.db.addDownloadCount(packageName, version).catch((err) => {
        logger.error({ err }, "Failed to add download count; @{err}");
      });
    });

    return next();
  };
}
