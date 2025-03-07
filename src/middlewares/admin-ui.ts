import type {
  ListActionResponse,
  RecordActionResponse,
  ResourceOptions,
  ResourceWithOptions,
  SearchActionResponse,
} from "adminjs";
import type { Application, Router } from "express";

import type { ConfigHolder } from "../config";
import type { PluginMiddleware } from "../types";

import { PERIOD_TYPES } from "../constants";
import { DownloadStats, ManifestViewStats, Package } from "../models";
import { wrapPath } from "../utils";

const rootPath = wrapPath("/admin");

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
export class AdminUI implements PluginMiddleware {
  private adminRouter: null | Router = null;

  private config: ConfigHolder;

  constructor(config: ConfigHolder) {
    this.config = config;

    void this.create().then((router) => {
      this.adminRouter = router;
    });
  }

  static populatePackageIdListProperties(this: void, response: ListActionResponse) {
    for (const record of response.records) {
      if (record.populated.packageId?.params) {
        const params = record.populated.packageId.params;

        record.populated.packageId.title = `${params.name}@${params.version}`;
      }
    }

    return response;
  }

  static populatePackageIdSearchProperties(this: void, response: SearchActionResponse) {
    for (const record of response.records) {
      if (record.populated.packageId?.params) {
        const params = record.populated.packageId.params;

        record.populated.packageId.title = `${params.name}@${params.version}`;
      }
    }

    return response;
  }

  static populatePackageIdShowProperties(this: void, response: RecordActionResponse) {
    if (response.record.populated.packageId?.params) {
      const params = response.record.populated.packageId.params;

      response.record.populated.packageId.title = `${params.name}@${params.version}`;
    }

    return response;
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

    AdminJS.registerAdapter({
      Resource: AdminJSSequelize.Resource,
      Database: AdminJSSequelize.Database,
    });

    const admin = new AdminJS({
      resources: [
        {
          resource: Package,
          options: {
            actions: { ...defaultActions },
            listProperties: ["id", "name", "version", "createdAt"],
            showProperties: ["id", "name", "version", "createdAt"],
            filterProperties: ["name", "version"],
            sort: { sortBy: "createdAt", direction: "desc" },
          },
        },
        {
          resource: DownloadStats,
          options: {
            actions: {
              ...defaultActions,
              show: { after: AdminUI.populatePackageIdShowProperties },
              list: { after: AdminUI.populatePackageIdListProperties },
              search: { after: AdminUI.populatePackageIdSearchProperties },
            },
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
        {
          resource: ManifestViewStats,
          options: {
            actions: {
              ...defaultActions,
              show: { after: AdminUI.populatePackageIdShowProperties },
              list: { after: AdminUI.populatePackageIdListProperties },
              search: { after: AdminUI.populatePackageIdSearchProperties },
            },
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
      ] satisfies ResourceWithOptions[],
      rootPath: rootPath,
      branding: {
        companyName: this.config.title,
        logo: this.config.logo,
      },
      env: {
        ADMIN_JS_SKIP_BUNDLE: "true",
      },
    });

    return AdminJSExpress.buildRouter(admin);
  }
}
