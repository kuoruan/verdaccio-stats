import type { pluginUtils } from "@verdaccio/core";
import type { Express } from "express";

import { ParsedPluginConfig, type StatsConfig } from "./config";
import { plugin } from "./constants";
import { setLogger } from "./logger";
import { Stats } from "./stats";

export class Plugin implements pluginUtils.ExpressMiddleware<StatsConfig, never, never> {
  public get version(): number {
    return +plugin.version;
  }

  private parsedConfig: ParsedPluginConfig;
  private stats: Stats;

  constructor(
    public config: StatsConfig,
    public options: pluginUtils.PluginOptions,
  ) {
    setLogger(options.logger);

    this.parsedConfig = new ParsedPluginConfig(config, options.config);
    this.stats = new Stats(this.parsedConfig);
  }

  getVersion(): number {
    return this.version;
  }

  register_middlewares(app: Express): void {
    this.stats.register_middlewares(app);
  }
}
