import type { Config } from "@verdaccio/types";
import type { Options as SequelizeOptions } from "sequelize";

import z from "zod";

import {
  DEFAULT_DATABASE_HOST,
  DEFAULT_DATABASE_NAME,
  DEFAULT_DATABASE_PORT,
  DEFAULT_DIALECT,
  DEFAULT_SQLITE_STORAGE,
  DIALECTS,
} from "./constants";
import logger from "./logger";
import { normalizeFilePath } from "./utils";

const statsConfig = z
  .object({
    dialect: z
      .enum(DIALECTS)
      .optional()
      .default(() => DEFAULT_DIALECT),
    database: z.union([
      z.string().default(() => DEFAULT_SQLITE_STORAGE),
      z.object({
        name: z
          .string()
          .optional()
          .default(() => DEFAULT_DATABASE_NAME),
        username: z
          .string()
          .optional()
          .default(() => process.env.VERDACCIO_STATS_USERNAME ?? ""),
        password: z
          .string()
          .optional()
          .default(() => process.env.VERDACCIO_STATS_PASSWORD ?? ""),
        host: z
          .string()
          .optional()
          .default(() => DEFAULT_DATABASE_HOST),
        port: z
          .number()
          .min(1)
          .max(65_535)
          .optional()
          .default(() => DEFAULT_DATABASE_PORT),
      }),
    ]),
    "iso-week": z
      .boolean()
      .optional()
      .default(() => false),
    "count-downloads": z
      .boolean()
      .optional()
      .default(() => true),
    "count-manifest-views": z
      .boolean()
      .optional()
      .default(() => true),
  })
  .superRefine((data, ctx) => {
    if (data.dialect === "sqlite") {
      if (typeof data.database !== "string" || !data.database) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SQLite storage path is required and must be a non-empty string",
          path: ["storage"],
        });
      }
    } else {
      if (data.database) {
        for (const key of ["name", "username", "password", "host", "port"] as const) {
          if (!data.database[key]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Database ${key} is required for non-SQLite dialects`,
              path: ["database", key],
            });
          }
        }
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Database configuration is required for non-SQLite dialects",
          path: ["database"],
        });
      }
    }
  });

export interface ConfigHolder {
  countDownloads: boolean;
  countManifestViews: boolean;
  favicon: string;
  isoWeek: boolean;
  logo?: string;
  sequelizeOptions: SequelizeOptions;
  title: string;
}

export type StatsConfig = z.infer<typeof statsConfig>;

export class ParsedPluginConfig implements ConfigHolder {
  readonly favicon: string = "/-/static/favicon.ico";

  get configPath(): string {
    return this.verdaccioConfig.configPath ?? this.verdaccioConfig.self_path;
  }

  get countDownloads(): boolean {
    return this.config["count-downloads"];
  }

  get countManifestViews(): boolean {
    return this.config["count-manifest-views"];
  }

  get isoWeek(): boolean {
    return this.config["iso-week"];
  }

  get logo(): string | undefined {
    return this.verdaccioConfig.web?.logo;
  }

  get sequelizeOptions(): SequelizeOptions {
    if (this.config.dialect === "sqlite" && typeof this.config.database === "string") {
      return {
        dialect: "sqlite",
        storage: normalizeFilePath(this.configPath, this.config.database),
      };
    }

    if (this.config.dialect !== "sqlite" && typeof this.config.database === "object") {
      return {
        dialect: this.config.dialect,
        database: this.config.database.name,
        username: this.config.database.username,
        password: this.config.database.password,
        host: this.config.database.host,
        port: this.config.database.port,
      };
    }

    return {
      dialect: DEFAULT_DIALECT,
      storage: normalizeFilePath(this.configPath, DEFAULT_SQLITE_STORAGE),
    };
  }

  get title(): string {
    return this.verdaccioConfig.web?.title ? `${this.verdaccioConfig.web.title} - Stats` : "Verdaccio Stats";
  }

  private config: StatsConfig;

  constructor(
    config: StatsConfig,
    private readonly verdaccioConfig: Config,
  ) {
    try {
      this.config = statsConfig.parse(config);
    } catch (err: any) {
      const fieldErrors = (err as z.ZodError).flatten().fieldErrors;

      logger.error({ errors: fieldErrors }, "Invalid config for verdaccio stats plugin, @{errors}");

      process.exit(1);
    }
  }
}
