import { name, version } from "../package.json";

export const plugin = {
  name,
  version,
};

export const pluginKey = name.replace("verdaccio-", "");

export const UNIVERSE_PACKAGE_NAME = "**";

export const UNIVERSE_PACKAGE_VERSION = "*";

export const PERIOD_TYPES = ["overall", "yearly", "monthly", "weekly", "daily"] as const;

export const PERIOD_VALUE_TOTAL = "total";

export const DEFAULT_SQLITE_FILE = "stats.db";

export const ROUTE_TARBALL_DOWNLOAD = "/:package/-/:filename";

export const ROUTE_SCOPED_TARBALL_DOWNLOAD = "/@:scope/:package/-/:filename";

export const ROUTE_MANIFEST_VIEW = "/:package/:version?";

export const ROUTE_SCOPED_MANIFEST_VIEW = "/@:scope/:package/:version?";

export const API_BASE_PATH = "/-/verdaccio/stats";
