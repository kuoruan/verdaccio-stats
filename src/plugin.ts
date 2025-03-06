import type { pluginUtils } from "@verdaccio/core";
import type { Express } from "express";

import { ParsedPluginConfig, type StatsConfig } from "./config";
import { plugin } from "./constants";
import { setLogger } from "./logger";
import { DownloadStats } from "./stats";

export class Plugin implements pluginUtils.ExpressMiddleware<StatsConfig, never, never> {
  public get version(): number {
    return +plugin.version;
  }

  private downloadStats: DownloadStats;
  private parsedConfig: ParsedPluginConfig;

  constructor(
    public config: StatsConfig,
    public options: pluginUtils.PluginOptions,
  ) {
    setLogger(options.logger);

    this.parsedConfig = new ParsedPluginConfig(config, options.config);
    this.downloadStats = new DownloadStats(this.parsedConfig);
  }

  getVersion(): number {
    return +plugin.version;
  }

  register_middlewares(app: Express): void {
    this.downloadStats.register_middlewares(app);
  }
}
