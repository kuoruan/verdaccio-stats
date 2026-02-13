import { name, version } from "../package.json";

export const plugin = {
  name,
  version,
};

export const pluginKey = name.replace("verdaccio-", "");

export const DIALECTS = ["mariadb", "mssql", "mysql", "postgres", "sqlite"] as const;

export const DEFAULT_DIALECT = "sqlite" as (typeof DIALECTS)[number];

export const DEFAULT_SQLITE_STORAGE = "stats.db";

export const DEFAULT_DATABASE_NAME = "verdaccio_stats";

export const DEFAULT_DATABASE_HOST = "localhost";

export const DEFAULT_DATABASE_PORT = 3306;

export const UNIVERSE_PACKAGE_NAME = "**";

export const UNIVERSE_PACKAGE_VERSION = "*";

export const PERIOD_TYPES = ["overall", "yearly", "monthly", "weekly", "daily"] as const;

export const PERIOD_VALUE_TOTAL = "total";

export const ROUTE_TARBALL_DOWNLOAD = "/:package/-/:filename";

export const ROUTE_SCOPED_TARBALL_DOWNLOAD = "/@:scope/:package/-/:filename";

export const ROUTE_MANIFEST_VIEW = "/:package/:version?";

export const ROUTE_SCOPED_MANIFEST_VIEW = "/@:scope/:package/:version?";

export const WEB_PATH = "/-/web/stats";

export const API_BASE_PATH = "/-/stats";
