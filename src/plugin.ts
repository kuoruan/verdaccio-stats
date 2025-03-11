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

  private db: Database;
  private parsedConfig: ParsedPluginConfig;

  constructor(
    public config: StatsConfig,
    public options: pluginUtils.PluginOptions,
  ) {
    setLogger(options.logger);

    this.parsedConfig = new ParsedPluginConfig(config, options.config);

    this.db = new Database(this.parsedConfig);

    void this.initDB();
  }

  getVersion(): number {
    return this.version;
  }

  register_middlewares(app: Express): void {
    const hooks = new Hooks(this.parsedConfig, this.db);
    const stats = new Stats(this.parsedConfig, this.db);
    const ui = new UI(this.parsedConfig);

    for (const middleware of [hooks, stats, ui] satisfies PluginMiddleware[]) {
      middleware.register_middlewares(app);
    }
  }

  private async initDB(): Promise<void> {
    try {
      await this.db.authenticate();
      await this.db.migrate();
    } catch (err) {
      logger.error({ err }, "Failed to initialize database; @{err}");
      process.exit(1);
    }
  }
}
