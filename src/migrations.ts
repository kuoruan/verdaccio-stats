import type { RunnableMigration } from "umzug";

import { DataTypes, type Sequelize } from "sequelize";

import { UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "./constants";

export const migrations: RunnableMigration<Sequelize>[] = [
  {
    name: "000-initial",
    up: async ({ context: sequelize }) => {
      const queryInterface = sequelize.getQueryInterface();

      await Promise.all([
        queryInterface.createTable("packages", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
          name: { allowNull: false, type: DataTypes.STRING(100) },
          version: { allowNull: false, type: DataTypes.STRING(50) },
          created_at: { allowNull: false, type: DataTypes.DATE },
          updated_at: { allowNull: false, type: DataTypes.DATE },
        }),
        queryInterface.createTable("download_stats", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
          package_id: { allowNull: false, type: DataTypes.INTEGER },
          period_type: { allowNull: false, type: DataTypes.STRING(20) },
          period_value: { allowNull: false, type: DataTypes.STRING(20) },
          count: { allowNull: false, type: DataTypes.BIGINT, defaultValue: 0 },
          created_at: { allowNull: false, type: DataTypes.DATE },
          updated_at: { allowNull: false, type: DataTypes.DATE },
        }),
        queryInterface.createTable("manifest_view_stats", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
          package_id: { allowNull: false, type: DataTypes.INTEGER },
          period_type: { allowNull: false, type: DataTypes.STRING(20) },
          period_value: { allowNull: false, type: DataTypes.STRING(20) },
          count: { allowNull: false, type: DataTypes.BIGINT, defaultValue: 0 },
          created_at: { allowNull: false, type: DataTypes.DATE },
          updated_at: { allowNull: false, type: DataTypes.DATE },
        }),
      ]);

      await Promise.all([
        queryInterface.addIndex("packages", ["name", "version"], {
          unique: true,
          name: "packages_index",
        }),
        queryInterface.addIndex("download_stats", ["package_id", "period_type", "period_value"], {
          name: "download_stats_index",
        }),
        queryInterface.addIndex("manifest_view_stats", ["package_id", "period_type", "period_value"], {
          name: "manifest_view_stats_index",
        }),
      ]);

      return queryInterface.bulkInsert("packages", [
        {
          name: UNIVERSE_PACKAGE_NAME,
          version: UNIVERSE_PACKAGE_VERSION,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    },
    down: async ({ context: Sequelize }) => {
      const queryInterface = Sequelize.getQueryInterface();

      await Promise.all([
        queryInterface.removeIndex("packages", "packages_index"),
        queryInterface.removeIndex("download_stats", "download_stats_index"),
        queryInterface.removeIndex("manifest_view_stats", "manifest_view_stats_index"),
      ]);

      return Promise.all(
        ["packages", "download_stats", "manifest_view_stats"].map((table) => queryInterface.dropTable(table)),
      );
    },
  },
];
