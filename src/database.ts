import { INTEGER, Sequelize, TEXT, type Transaction } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";

import { PERIOD_TYPES, UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "./constants";
import { debug, getUmzugLogger } from "./debugger";
import { migrations } from "./migrations";
import { DownloadStats, ManifestViewStats, Package } from "./models";
import { getPeriodValue } from "./utils";

export interface Options {
  file: string;
  isoWeek?: boolean;
}

export class Database {
  private options: Options;
  private sequelize: Sequelize;
  private umzug: Umzug<Sequelize>;

  private constructor(opts: Options) {
    const sequelize = new Sequelize({
      dialect: "sqlite",
      storage: opts.file,
      logging: (sql) => debug(sql),
    });

    const umzug = new Umzug({
      context: () => sequelize,
      migrations: migrations,
      storage: new SequelizeStorage({ sequelize, modelName: "migration_meta" }),
      logger: getUmzugLogger(),
    });

    this.options = opts;
    this.sequelize = sequelize;
    this.umzug = umzug;
  }

  static async create(opts: Options) {
    const db = new Database(opts);

    await db.migrate();
    await db.init();

    return db;
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

  public migrate() {
    return this.umzug.up();
  }

  public rollback() {
    return this.umzug.down();
  }

  private async addDownloadForAllPeriod(pkg: Package, transaction: Transaction) {
    return Promise.all(
      PERIOD_TYPES.map(async (periodType) => {
        const [downloadStats] = await DownloadStats.findOrCreate({
          where: {
            packageId: pkg.id,
            periodType: periodType,
            periodValue: getPeriodValue(periodType, undefined, this.options.isoWeek),
          },
          transaction,
        });

        return downloadStats.increment("count", { by: 1, transaction });
      }),
    );
  }

  private async addManifestViewForAllPeriod(pkg: Package, transaction: Transaction) {
    return Promise.all(
      PERIOD_TYPES.map(async (periodType) => {
        const [manifestViewStats] = await ManifestViewStats.findOrCreate({
          where: {
            packageId: pkg.id,
            periodType: periodType,
            periodValue: getPeriodValue(periodType, undefined, this.options.isoWeek),
          },
          transaction,
        });

        return manifestViewStats.increment("count", { by: 1, transaction });
      }),
    );
  }

  private async addPackageDownloadCount(packageName: string, version: string, transaction: Transaction) {
    const [pkg] = await Package.findOrCreate({ where: { name: packageName, version }, transaction });

    if (!pkg) {
      throw new Error("Package not found");
    }

    return this.addDownloadForAllPeriod(pkg, transaction);
  }

  private async addPackageManifestViewCount(packageName: string, version: string, transaction: Transaction) {
    const [pkg] = await Package.findOrCreate({ where: { name: packageName, version }, transaction });

    if (!pkg) {
      throw new Error("Package not found");
    }

    return this.addManifestViewForAllPeriod(pkg, transaction);
  }

  private async addTotalDownloadCount(transaction: Transaction) {
    const universePkg = await Package.findOne({
      where: { name: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
      transaction,
    });

    if (!universePkg) {
      throw new Error("Universe package not found");
    }

    return this.addDownloadForAllPeriod(universePkg, transaction);
  }

  private async addTotalManifestViewCount(transaction: Transaction) {
    const universePkg = await Package.findOne({
      where: { name: UNIVERSE_PACKAGE_NAME, version: UNIVERSE_PACKAGE_VERSION },
      transaction,
    });

    if (!universePkg) {
      throw new Error("Universe package not found");
    }

    return this.addManifestViewForAllPeriod(universePkg, transaction);
  }

  private async init() {
    await Promise.all([
      Package.init(
        {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          name: { allowNull: false, type: TEXT },
          version: { allowNull: false, type: TEXT },
        },
        { sequelize: this.sequelize, tableName: "packages", underscored: true },
      ),
      DownloadStats.init(
        {
          count: { allowNull: false, type: INTEGER, defaultValue: 0 },
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          packageId: { allowNull: false, type: INTEGER },
          periodType: { allowNull: false, type: TEXT },
          periodValue: { allowNull: false, type: TEXT },
        },
        { sequelize: this.sequelize, tableName: "download_stats", underscored: true },
      ),
      ManifestViewStats.init(
        {
          count: { allowNull: false, type: INTEGER, defaultValue: 0 },
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          packageId: { allowNull: false, type: INTEGER },
          periodType: { allowNull: false, type: TEXT },
          periodValue: { allowNull: false, type: TEXT },
        },
        { sequelize: this.sequelize, tableName: "manifest_view_stats", underscored: true },
      ),
    ]);

    Package.hasMany(DownloadStats, {
      foreignKey: "packageId",
    });
    Package.hasMany(ManifestViewStats, {
      foreignKey: "packageId",
    });
    DownloadStats.belongsTo(Package);
    ManifestViewStats.belongsTo(Package);
  }
}
