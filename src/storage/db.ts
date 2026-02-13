import { type CreationAttributes, Op, type QueryInterface, type Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { SequelizeStorage, Umzug } from "umzug";

import type { ConfigHolder } from "../config";
import { PERIOD_TYPES, UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "../constants";
import { debug, getUmzugLogger } from "../debugger";
import logger from "../logger";
import { migrations } from "../migrations";
import { DownloadStats, ManifestViewStats, Package, type StatsModel } from "../models";
import { getPeriodValue } from "../utils";
import { fromPendingKey, joinKeyParts, toPendingKey } from "./entry";
import { EntryTarget, GroupedEntry, PendingKey, PeriodIncrement, PeriodPair, StatsKind } from "./types";

export class Database {
  private readonly config: ConfigHolder;
  private readonly sequelize: Sequelize;
  private readonly umzug: Umzug<QueryInterface>;

  private flushTimer: NodeJS.Timeout | null = null;
  private flushInFlight: Promise<void> | null = null;

  private pendingValues = new Map<PendingKey, number>();

  constructor(config: ConfigHolder) {
    const sequelizeOptions = config.sequelizeOptions;

    logger.debug({ dialect: sequelizeOptions.dialect }, "Creating @{dialect} database connection");

    const sequelize = new Sequelize({
      ...sequelizeOptions,
      logging: (sql) => debug(sql),
      pool: {
        max: 10,
        min: 2,
        acquire: 30_000,
        idle: 10_000,
      },
      dialectOptions: {
        timeout: 30_000,
      },
      models: [Package, DownloadStats, ManifestViewStats],
    });

    const umzug = new Umzug({
      context: () => sequelize.getQueryInterface(),
      migrations: migrations,
      storage: new SequelizeStorage({ sequelize, modelName: "migration_meta" }),
      logger: getUmzugLogger(),
    });

    this.config = config;
    this.sequelize = sequelize;
    this.umzug = umzug;
  }

  public addDownloadCount(packageName: string, version: string): Promise<void> {
    this.enqueueForAllPeriods(
      [
        { packageName: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
        { packageName, version: UNIVERSE_PACKAGE_VERSION },
        { packageName, version },
      ],
      "download",
    );

    return this.config.flushInterval === 0 ? this.flushInternal() : Promise.resolve();
  }

  public addManifestViewCount(packageName: string, version?: string): Promise<void> {
    const targets = [
      { packageName: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
      { packageName, version: UNIVERSE_PACKAGE_VERSION },
      ...(version ? [{ packageName, version }] : []),
    ];

    this.enqueueForAllPeriods(targets, "manifest");

    return this.config.flushInterval === 0 ? this.flushInternal() : Promise.resolve();
  }

  public async close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      await this.flush();
    } catch (err) {
      logger.error({ err }, "Failed to flush stats on close; @{err}");
    } finally {
      await this.sequelize.close();
    }
  }

  public async initialize() {
    await this.sequelize.authenticate();
    await this.umzug.up();

    this.startFlushTimer();
  }

  public rollback() {
    return this.umzug.down();
  }

  public flush(): Promise<void> {
    return this.flushInternal();
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    if (this.config.flushInterval === 0) {
      logger.debug("Realtime flush enabled");
      return;
    }

    if (this.config.flushInterval < 0) {
      logger.debug("Flush timer disabled");
      return;
    }

    this.flushTimer = setInterval(() => {
      if (this.pendingValues.size === 0) return;
      void this.flushInternal().catch((err) => {
        logger.error({ err }, "Failed to flush stats; @{err}");
      });
    }, this.config.flushInterval);

    this.flushTimer.unref?.();
  }

  private enqueueForAllPeriods(targets: EntryTarget[], kind: StatsKind, at: Date = new Date()): void {
    for (const { packageName, version } of targets) {
      for (const periodType of PERIOD_TYPES) {
        const periodValue = getPeriodValue(periodType, at, this.config.isoWeek);

        const key = toPendingKey({ kind, packageName, version, periodType, periodValue });
        this.pendingValues.set(key, (this.pendingValues.get(key) ?? 0) + 1);
      }
    }

    if (this.config.flushInterval !== 0 && this.pendingValues.size >= this.config.maxPendingEntries) {
      void this.flushInternal().catch((err) => {
        logger.error({ err }, "Failed to flush stats after reaching max pending entries; @{err}");
      });
    }
  }

  private async flushInternal(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    if (this.pendingValues.size === 0) return;

    const snapshot = this.pendingValues;
    this.pendingValues = new Map();

    this.flushInFlight = (async () => {
      try {
        const grouped = new Map<string, GroupedEntry>();

        for (const [key, by] of snapshot.entries()) {
          if (by <= 0) continue;

          const e = fromPendingKey(key, by);
          const pkgKey = joinKeyParts(e.packageName, e.version);

          if (!grouped.has(pkgKey)) {
            grouped.set(pkgKey, {
              packageName: e.packageName,
              version: e.version,
              download: new Map(),
              manifest: new Map(),
            });
          }

          const g = grouped.get(pkgKey)!;
          const periodKey = joinKeyParts(e.periodType, e.periodValue);
          const target = e.kind === "download" ? g.download : g.manifest;

          const existing = target.get(periodKey);
          if (existing) {
            existing.by += e.by;
          } else {
            target.set(periodKey, { periodType: e.periodType, periodValue: e.periodValue, by: e.by });
          }
        }

        if (grouped.size === 0) return;

        await this.sequelize.transaction(async (t) => {
          const packagesToEnsure = [...grouped.values()].map((g) => ({ name: g.packageName, version: g.version }));

          await Package.bulkCreate(packagesToEnsure, {
            ignoreDuplicates: true,
            transaction: t,
          });

          const packageOr = packagesToEnsure.map((p) => ({ name: p.name, version: p.version }));
          const ensuredPackages = await Package.findAll({
            where: { [Op.or]: packageOr },
            attributes: ["id", "name", "version"],
            transaction: t,
          });

          const pkgIdByKey = new Map<string, number>();
          for (const p of ensuredPackages) {
            pkgIdByKey.set(joinKeyParts(p.name, p.version), p.id);
          }

          const applyTasks: Promise<void>[] = [];

          for (const [pkgKey, g] of grouped.entries()) {
            const packageId = pkgIdByKey.get(pkgKey);
            if (!packageId) {
              throw new Error(`Package ${g.packageName}@${g.version} not found after ensure`);
            }

            if (g.download.size > 0) {
              applyTasks.push(this.applyIncrements(DownloadStats, packageId, [...g.download.values()], t));
            }

            if (g.manifest.size > 0) {
              applyTasks.push(this.applyIncrements(ManifestViewStats, packageId, [...g.manifest.values()], t));
            }
          }

          await Promise.all(applyTasks);
        });
      } catch (err) {
        for (const [key, by] of snapshot.entries()) {
          this.pendingValues.set(key, (this.pendingValues.get(key) ?? 0) + by);
        }

        throw err;
      }
    })().finally(() => {
      this.flushInFlight = null;
    });

    return this.flushInFlight;
  }

  private async applyIncrements<T extends typeof DownloadStats | typeof ManifestViewStats>(
    statsModel: T,
    packageId: number,
    increments: PeriodIncrement[],
    transaction: Transaction,
  ): Promise<void> {
    if (increments.length === 0) return;

    const uniquePeriodPairs = new Map<string, PeriodPair>();
    for (const inc of increments) {
      uniquePeriodPairs.set(joinKeyParts(inc.periodType, inc.periodValue), {
        periodType: inc.periodType,
        periodValue: inc.periodValue,
      });
    }

    const periodValues = [...uniquePeriodPairs.values()];
    const existingStats = await statsModel.findAll({
      where: { packageId, [Op.or]: periodValues },
      transaction,
    });

    const existingByPeriodKey = new Map<string, InstanceType<T>>();
    for (const stat of existingStats) {
      existingByPeriodKey.set(joinKeyParts(stat.periodType, stat.periodValue), stat as InstanceType<T>);
    }

    const rowsToCreate: CreationAttributes<InstanceType<typeof StatsModel>>[] = [];
    const incrementsToApply: { id: number; by: number }[] = [];

    for (const inc of increments) {
      const periodKey = joinKeyParts(inc.periodType, inc.periodValue);
      const existing = existingByPeriodKey.get(periodKey);

      if (existing) {
        incrementsToApply.push({ id: existing.id, by: inc.by });
      } else {
        rowsToCreate.push({ packageId, periodType: inc.periodType, periodValue: inc.periodValue, count: inc.by });
      }
    }

    if (rowsToCreate.length > 0) {
      await statsModel.bulkCreate(rowsToCreate, { transaction });
    }

    const idsByAmount = new Map<number, number[]>();
    for (const inc of incrementsToApply) {
      const ids = idsByAmount.get(inc.by);
      if (ids) {
        ids.push(inc.id);
      } else {
        idsByAmount.set(inc.by, [inc.id]);
      }
    }

    await Promise.all(
      [...idsByAmount.entries()].map(([by, ids]) =>
        statsModel.increment("count", { by, where: { id: { [Op.in]: ids } }, transaction }),
      ),
    );
  }
}
