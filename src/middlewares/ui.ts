import type { ResourceOptions, ResourceWithOptions } from "adminjs";
import type { Application, Router } from "express";

import type { ConfigHolder } from "../config";
import { PERIOD_TYPES } from "../constants";
import { DownloadStats, ManifestViewStats, Package } from "../models";
import type { PluginMiddleware } from "../types";
import { wrapPath } from "../utils";

const rootPath = wrapPath("/ui");

const defaultActions = {
  new: { isAccessible: false },
  edit: { isAccessible: false },
  delete: { isAccessible: false },
  bulkDelete: { isAccessible: false },
} satisfies ResourceOptions["actions"];

process.env.ADMIN_JS_SKIP_BUNDLE = "true";

/**
 * Add Admin UI to the application.
 */
export class UI implements PluginMiddleware {
  private adminRouter: null | Router = null;

  private config: ConfigHolder;

  constructor(config: ConfigHolder) {
    this.config = config;

    void this.create().then((router) => {
      this.adminRouter = router;
    });
  }

  register_middlewares(app: Application) {
    app.use(rootPath, (req, res, next) => {
      if (this.adminRouter) {
        return this.adminRouter(req, res, next);
      } else {
        res.status(503).send("Admin UI is not ready yet.");
      }
    });
  }

  private async create(): Promise<Router> {
    const [AdminJS, AdminJSExpress, AdminJSSequelize] = await Promise.all([
      import("adminjs").then((mod) => mod.default),
      import("@adminjs/express").then((mod) => mod.default),
      import("@adminjs/sequelize").then((mod) => mod.default),
    ]);

    AdminJS.registerAdapter(AdminJSSequelize);

    const admin = new AdminJS({
      resources: (
        [
          {
            resource: Package,
            options: {
              actions: {
                ...defaultActions,
                search: {
                  before: (request) => {
                    if (request.params.action !== "search") {
                      return request;
                    }
                    request.query = { ...request.query, searchProperty: "name" };
                    return request;
                  },
                },
              },
              titleProperty: "displayName",
              listProperties: ["id", "name", "version", "createdAt"],
              showProperties: ["id", "name", "version", "createdAt"],
              filterProperties: ["name", "version"],
              sort: { sortBy: "createdAt", direction: "desc" },
            },
          },
          this.config.countDownloads && {
            resource: DownloadStats,
            options: {
              actions: { ...defaultActions },
              properties: {
                periodType: {
                  availableValues: PERIOD_TYPES.map((type) => ({ value: type, label: type })),
                },
              },
              listProperties: ["id", "packageId", "periodType", "periodValue", "count", "createdAt", "updatedAt"],
              showProperties: ["id", "packageId", "periodType", "periodValue", "count", "createdAt", "updatedAt"],
              filterProperties: ["packageId", "periodType", "periodValue", "createdAt", "updatedAt"],
              sort: { sortBy: "updatedAt", direction: "desc" },
            },
          },
          this.config.countManifestViews && {
            resource: ManifestViewStats,
            options: {
              actions: { ...defaultActions },
              properties: {
                periodType: {
                  availableValues: PERIOD_TYPES.map((type) => ({ value: type, label: type })),
                },
              },
              listProperties: ["id", "packageId", "periodType", "periodValue", "count", "createdAt", "updatedAt"],
              showProperties: ["id", "packageId", "periodType", "periodValue", "count", "createdAt", "updatedAt"],
              filterProperties: ["packageId", "periodType", "periodValue", "createdAt", "updatedAt"],
              sort: { sortBy: "updatedAt", direction: "desc" },
            },
          },
        ] satisfies (false | ResourceWithOptions)[]
      ).filter(Boolean),
      rootPath: rootPath,
      branding: {
        companyName: this.config.title,
        logo: this.config.logo,
        favicon: this.config.favicon,
      },
      env: {
        ADMIN_JS_SKIP_BUNDLE: "true",
      },
    });

    return AdminJSExpress.buildRouter(admin);
  }
}
