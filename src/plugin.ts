import type { pluginUtils } from "@verdaccio/core";
import type { Express } from "express";

import type { PluginMiddleware } from "./types";

import { ParsedPluginConfig, type StatsConfig } from "./config";
import { plugin } from "./constants";
import logger, { setLogger } from "./logger";
import { Hooks } from "./middlewares/hooks";
import { Stats } from "./middlewares/stats";
import { UI } from "./middlewares/ui";
import { Database } from "./storage/db";

export class Plugin implements pluginUtils.ExpressMiddleware<StatsConfig, never, never> {
  public get version(): number {
    return +plugin.version;
  }

  private parsedConfig: ParsedPluginConfig;

  constructor(
    public config: StatsConfig,
    public options: pluginUtils.PluginOptions,
  ) {
    setLogger(options.logger);

    this.parsedConfig = new ParsedPluginConfig(config, options.config);
  }

  getVersion(): number {
    return this.version;
  }

  register_middlewares(app: Express): void {
    const db = Database.create(this.parsedConfig);

    const hooks = new Hooks(this.parsedConfig);
    const stats = new Stats(this.parsedConfig);
    const ui = new UI(this.parsedConfig);

    db.then((db) => {
      hooks.setDatabase(db);
      stats.setDatabase(db);
    }).catch((err) => {
      logger.error({ err }, "Failed to initialize database; @{err}");
      process.exit(1);
    });

    for (const middleware of [hooks, stats, ui] satisfies PluginMiddleware[]) {
      middleware.register_middlewares(app);
    }
  }
}
