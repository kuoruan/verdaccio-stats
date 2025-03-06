import type { RunnableMigration } from "umzug";

import { DATE, INTEGER, type Sequelize, TEXT } from "sequelize";

import { UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "./constants";

export const migrations: RunnableMigration<Sequelize>[] = [
  {
    name: "000-initial",
    up: async ({ context: sequelize }) => {
      const queryInterface = sequelize.getQueryInterface();

      await Promise.all([
        queryInterface.createTable("packages", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          name: { allowNull: false, type: TEXT },
          version: { allowNull: false, type: TEXT },
          created_at: { allowNull: false, type: DATE },
          updated_at: { allowNull: false, type: DATE },
        }),
        queryInterface.createTable("download_stats", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          package_id: { allowNull: false, type: INTEGER },
          period_type: { allowNull: false, type: TEXT },
          period_value: { allowNull: false, type: TEXT },
          count: { allowNull: false, type: INTEGER, defaultValue: 0 },
          created_at: { allowNull: false, type: DATE },
          updated_at: { allowNull: false, type: DATE },
        }),
        queryInterface.createTable("manifest_view_stats", {
          id: { allowNull: false, autoIncrement: true, primaryKey: true, type: INTEGER },
          package_id: { allowNull: false, type: INTEGER },
          period_type: { allowNull: false, type: TEXT },
          period_value: { allowNull: false, type: TEXT },
          count: { allowNull: false, type: INTEGER, defaultValue: 0 },
          created_at: { allowNull: false, type: DATE },
          updated_at: { allowNull: false, type: DATE },
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
