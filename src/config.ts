import type { Config } from "@verdaccio/types";

import z from "zod";

import { DEFAULT_SQLITE_FILE } from "./constants";
import logger from "./logger";
import { normalizeFilePath } from "./utils";

const statsConfig = z.object({
  file: z.string().optional(),
  "iso-week": z.boolean().optional(),
  "count-downloads": z.boolean().optional(),
  "count-manifest-views": z.boolean().optional(),
});

export interface ConfigHolder {
  countDownloads: boolean;
  countManifestViews: boolean;
  file: string;
  isoWeek: boolean;
}

export type StatsConfig = z.infer<typeof statsConfig>;

export class ParsedPluginConfig implements ConfigHolder {
  get configPath(): string {
    return this.verdaccioConfig.configPath ?? this.verdaccioConfig.self_path;
  }

  get countDownloads(): boolean {
    return this.config["count-downloads"] ?? true;
  }

  get countManifestViews(): boolean {
    return this.config["count-manifest-views"] ?? true;
  }

  get file(): string {
    return normalizeFilePath(this.configPath, this.config.file ?? DEFAULT_SQLITE_FILE);
  }

  get isoWeek(): boolean {
    return this.config["iso-week"] ?? false;
  }

  constructor(
    private readonly config: StatsConfig,
    private readonly verdaccioConfig: Config,
  ) {
    try {
      statsConfig.parse(config);
    } catch (err: any) {
      const zodError = err as z.ZodError;

      logger.error({ errors: zodError.flatten().fieldErrors }, "Invalid config, @{errors}");

      process.exit(1);
    }
  }
}
