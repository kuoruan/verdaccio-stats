import { name, version } from "../package.json";

export const plugin = {
  name,
  version,
};

export const pluginKey = name.replace("verdaccio-", "");

export const UNIVERSE_PACKAGE_NAME = "**";

export const UNIVERSE_PACKAGE_VERSION = "*";

export const PERIOD_TYPES = ["overall", "daily", "monthly", "weekly", "yearly"] as const;

export const PERIOD_VALUE_TOTAL = "total";

export const DEFAULT_SQLITE_FILE = "stats.db";
