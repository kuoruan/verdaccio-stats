import type { Config } from "@verdaccio/types";
import ms, { type StringValue } from "ms";
import type { Options as SequelizeOptions } from "sequelize";
import { z } from "zod";

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
    "dialect-options": z
      .record(z.string(), z.unknown())
      .optional()
      .default(() => ({})),
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
    "flush-interval": z
      .union([z.number().int().nonnegative(), z.string().min(1)])
      .optional()
      .default(() => 5000),
    "max-pending-entries": z
      .number()
      .int()
      .positive()
      .optional()
      .default(() => 10_000),
  })
  .superRefine((data, ctx) => {
    const flushInterval = data["flush-interval"];
    if (typeof flushInterval === "string") {
      const parsed = ms(flushInterval as StringValue);
      if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Flush interval must be a valid duration string or a non-negative number (ms)",
          path: ["flush-interval"],
        });
      }
    }

    if (data.dialect === "sqlite") {
      if (typeof data.database !== "string" || !data.database) {
        ctx.addIssue({
          code: "custom",
          message: "SQLite storage path is required and must be a non-empty string",
          path: ["storage"],
        });
      }
    } else {
      if (data.database) {
        for (const key of ["name", "username", "password", "host", "port"] as const) {
          if (!data.database[key]) {
            ctx.addIssue({
              code: "custom",
              message: `Database ${key} is required for non-SQLite dialects`,
              path: ["database", key],
            });
          }
        }
      } else {
        ctx.addIssue({
          code: "custom",
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
  flushInterval: number;
  isoWeek: boolean;
  logo?: string;
  maxPendingEntries: number;
  dialectOptions: Record<string, unknown>;
  sequelizeOptions: SequelizeOptions;
  title: string;
}

export type StatsConfig = z.infer<typeof statsConfig>;

export class ParsedPluginConfig implements ConfigHolder {
  private config: StatsConfig;

  readonly favicon: string = "/-/static/favicon.ico";

  constructor(
    config: StatsConfig,
    private readonly verdaccioConfig: Config,
  ) {
    try {
      this.config = statsConfig.parse(config);
    } catch (err: any) {
      const flattened = z.flattenError<StatsConfig>(err);

      const errorMessages = [
        ...flattened.formErrors,
        ...Object.entries(flattened.fieldErrors).flatMap(([key, errs]) => (errs ?? []).map((e) => `[${key}] ${e}`)),
      ];

      logger.error({ errors: errorMessages.join("\n") }, "Invalid config for verdaccio stats plugin:\n@{errors}");

      process.exit(1);
    }
  }

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

  get flushInterval(): number {
    const v = this.config["flush-interval"];
    if (typeof v === "number") return v;
    return ms(v as StringValue) ?? 0;
  }

  get maxPendingEntries(): number {
    return this.config["max-pending-entries"];
  }

  get maxPendingKeys(): number {
    return this.maxPendingEntries;
  }

  get logo(): string | undefined {
    return this.verdaccioConfig.web?.logo;
  }

  get dialectOptions(): Record<string, unknown> {
    return this.config["dialect-options"];
  }

  get sequelizeOptions(): SequelizeOptions {
    const dialect = this.config.dialect;

    if (dialect === "sqlite") {
      return {
        dialect: "sqlite",
        storage: normalizeFilePath(
          this.configPath,
          typeof this.config.database === "string" ? this.config.database : DEFAULT_SQLITE_STORAGE,
        ),
      };
    }

    const dbConfig = (this.config.database ?? {}) as {
      name: string;
      username: string;
      password: string;
      host: string;
      port: number;
    };

    // Non-SQLite dialects
    return {
      dialect: dialect,
      database: dbConfig.name,
      username: dbConfig.username,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
    };
  }

  get title(): string {
    return this.verdaccioConfig.web?.title ? `${this.verdaccioConfig.web.title} - Stats` : "Verdaccio Stats";
  }
}
