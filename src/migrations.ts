import type { CreationAttributes, QueryInterface } from "sequelize";
import type { RunnableMigration } from "umzug";

import { UNIVERSE_PACKAGE_NAME, UNIVERSE_PACKAGE_VERSION } from "./constants";
import { DownloadStats, ManifestViewStats, Package } from "./models";

export const migrations: RunnableMigration<QueryInterface>[] = [
  {
    name: "000-initial",
    up: async () => {
      await Promise.all([Package.sync(), DownloadStats.sync(), ManifestViewStats.sync()]);

      return Package.bulkCreate([
        {
          name: UNIVERSE_PACKAGE_NAME,
          version: UNIVERSE_PACKAGE_VERSION,
        },
      ] as CreationAttributes<Package>[]);
    },
    down: async () => {
      return Promise.all([Package.drop(), DownloadStats.drop(), ManifestViewStats.drop()]);
    },
  },
];
