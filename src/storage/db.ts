import debug from "debug";
import { DataTypes, Op, Sequelize, type Transaction } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";

import type { ConfigHolder } from "../config";

import { PERIOD_TYPES, UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "../constants";
import { getUmzugLogger } from "../debugger";
import logger from "../logger";
import { migrations } from "../migrations";
import { DownloadStats, ManifestViewStats, Package } from "../models";
import { getCurrentPeriodValue } from "../utils";

export class Database {
  private config: ConfigHolder;
  private sequelize: Sequelize;
  private umzug: Umzug<Sequelize>;

  private universePackage: null | Package = null;

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
    });

    const umzug = new Umzug({
      context: () => sequelize,
      migrations: migrations,
      storage: new SequelizeStorage({ sequelize, modelName: "migration_meta" }),
      logger: getUmzugLogger(),
    });

    this.config = config;
    this.sequelize = sequelize;
    this.umzug = umzug;

    this.init();
  }

  public async addDownloadCount(packageName: string, version: string) {
    const t = await this.sequelize.transaction();

    try {
      await Promise.all([
        this.addTotalDownloadCount(t),
        this.addPackageDownloadCount(packageName, UNIVERSE_PACKAGE_VERSION, t),
        this.addPackageDownloadCount(packageName, version, t),
      ]);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public async addManifestViewCount(packageName: string, version?: string) {
    const t = await this.sequelize.transaction();

    try {
      await Promise.all(
        [
          this.addTotalManifestViewCount(t),
          this.addPackageManifestViewCount(packageName, UNIVERSE_PACKAGE_VERSION, t),
          version && this.addPackageManifestViewCount(packageName, version, t),
        ].filter(Boolean),
      );

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  public authenticate() {
    return this.sequelize.authenticate();
  }

  public close() {
    return this.sequelize.close();
  }

  public migrate() {
    return this.umzug.up();
  }

  public rollback() {
    return this.umzug.down();
  }

  private async addDownloadForAllPeriod(pkg: Package, transaction: Transaction) {
    const periodValues = PERIOD_TYPES.map((periodType) => ({
      periodType,
      periodValue: getCurrentPeriodValue(periodType, this.config.isoWeek),
    }));

    const existingStats = await DownloadStats.findAll({
      where: {
        packageId: pkg.id,
        [Op.or]: periodValues,
      },
      transaction,
    });

    const statsToCreate: DownloadStats[] = [];
    const statsToUpdate: DownloadStats[] = [];

    for (const { periodType, periodValue } of periodValues) {
      const existingStat = existingStats.find(
        (stat) => stat.periodType === periodType && stat.periodValue === periodValue,
      );

      if (existingStat) {
        statsToUpdate.push(existingStat);
      } else {
        statsToCreate.push(DownloadStats.build({ packageId: pkg.id, periodType, periodValue, count: 1 }));
      }
    }

    return Promise.all([
      ...(statsToCreate.length > 0 ? [DownloadStats.bulkCreate(statsToCreate, { transaction })] : []),
      ...statsToUpdate.map((downloadStats) => downloadStats.increment("count", { by: 1, transaction })),
    ]);
  }

  private async addManifestViewForAllPeriod(pkg: Package, transaction: Transaction) {
    const periodValues = PERIOD_TYPES.map((periodType) => ({
      periodType,
      periodValue: getCurrentPeriodValue(periodType, this.config.isoWeek),
    }));

    const existingStats = await ManifestViewStats.findAll({
      where: {
        packageId: pkg.id,
        [Op.or]: periodValues,
      },
      transaction,
    });

    const statsToCreate: DownloadStats[] = [];
    const statsToUpdate: DownloadStats[] = [];

    for (const { periodType, periodValue } of periodValues) {
      const existingStat = existingStats.find(
        (stat) => stat.periodType === periodType && stat.periodValue === periodValue,
      );

      if (existingStat) {
        statsToUpdate.push(existingStat);
      } else {
        statsToCreate.push(ManifestViewStats.build({ packageId: pkg.id, periodType, periodValue, count: 1 }));
      }
    }

    return Promise.all([
      ...(statsToCreate.length > 0 ? [ManifestViewStats.bulkCreate(statsToCreate, { transaction })] : []),
      ...statsToUpdate.map((manifestViewStats) => manifestViewStats.increment("count", { by: 1, transaction })),
    ]);
  }

  private async addPackageDownloadCount(packageName: string, version: string, transaction: Transaction) {
    const pkg = await this.ensurePackageExists(packageName, version, transaction);

    return this.addDownloadForAllPeriod(pkg, transaction);
  }

  private async addPackageManifestViewCount(packageName: string, version: string, transaction: Transaction) {
    const pkg = await this.ensurePackageExists(packageName, version, transaction);

    return this.addManifestViewForAllPeriod(pkg, transaction);
  }

  private async addTotalDownloadCount(transaction: Transaction) {
    const universePkg = await this.ensureUniversePackageExists(transaction);

    return this.addDownloadForAllPeriod(universePkg, transaction);
  }

  private async addTotalManifestViewCount(transaction: Transaction) {
    const universePkg = await this.ensureUniversePackageExists(transaction);

    return this.addManifestViewForAllPeriod(universePkg, transaction);
  }

  private async ensurePackageExists(packageName: string, version: string, transaction: Transaction): Promise<Package> {
    const [pkg] = await Package.findOrCreate({ where: { name: packageName, version }, transaction });

    if (!pkg) {
      throw new Error(`Package ${packageName}@${version} not found and could not be created`);
    }

    return pkg;
  }

  private async ensureUniversePackageExists(transaction: Transaction): Promise<Package> {
    if (this.universePackage) {
      return this.universePackage;
    }

    const universePkg = await Package.findOne({
      where: { name: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
      transaction,
    });

    if (!universePkg) {
      throw new Error("Universe package not found");
    }

    this.universePackage = universePkg;

    return universePkg;
  }

  private init() {
    Package.init(
      {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
        name: { allowNull: false, type: DataTypes.STRING(100) },
        version: { allowNull: false, type: DataTypes.STRING(50) },
        displayName: {
          type: DataTypes.VIRTUAL(DataTypes.STRING, ["name", "version"]),
          get() {
            return `${this.getDataValue("name")}@${this.getDataValue("version")}`;
          },
          set() {
            throw new Error("Virtual property, cannot be set");
          },
        },
      },
      { sequelize: this.sequelize, tableName: "packages", underscored: true },
    );
    DownloadStats.init(
      {
        count: { allowNull: false, type: DataTypes.BIGINT, defaultValue: 0 },
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
        packageId: { allowNull: false, type: DataTypes.INTEGER, references: { model: Package, key: "id" } },
        periodType: { allowNull: false, type: DataTypes.ENUM(...PERIOD_TYPES), values: PERIOD_TYPES },
        periodValue: { allowNull: false, type: DataTypes.STRING(20) },
      },
      {
        sequelize: this.sequelize,
        tableName: "download_stats",
        underscored: true,
      },
    );
    ManifestViewStats.init(
      {
        count: { allowNull: false, type: DataTypes.BIGINT, defaultValue: 0 },
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
        packageId: { allowNull: false, type: DataTypes.INTEGER, references: { model: Package, key: "id" } },
        periodType: { allowNull: false, type: DataTypes.ENUM(...PERIOD_TYPES), values: PERIOD_TYPES },
        periodValue: { allowNull: false, type: DataTypes.STRING(20) },
      },
      { sequelize: this.sequelize, tableName: "manifest_view_stats", underscored: true },
    );

    Package.hasMany(DownloadStats, {
      sourceKey: "id",
      foreignKey: "packageId",
    });
    Package.hasMany(ManifestViewStats, {
      sourceKey: "id",
      foreignKey: "packageId",
    });
    DownloadStats.belongsTo(Package, {
      targetKey: "id",
      foreignKey: "packageId",
      as: "package",
    });
    ManifestViewStats.belongsTo(Package, {
      targetKey: "id",
      foreignKey: "packageId",
      as: "package",
    });
  }
}
