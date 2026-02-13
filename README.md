# Verdaccio Stats Plugin

This plugin adds detailed statistics functionality to your Verdaccio private npm registry.

[![npm](https://img.shields.io/npm/v/verdaccio-stats.svg)](https://www.npmjs.com/package/verdaccio-stats)
[![npm](https://img.shields.io/npm/dw/verdaccio-stats.svg)](https://www.npmjs.com/package/verdaccio-stats)
[![npm](https://img.shields.io/npm/dt/verdaccio-stats.svg)](https://www.npmjs.com/package/verdaccio-stats)
[![npm](https://img.shields.io/npm/l/verdaccio-stats.svg)](https://www.npmjs.com/package/verdaccio-stats)

## Features

- Track package download statistics
- Track manifest view counts
- ISO week format support
- Admin interface to view statistics

## Installation

Install Globally

```bash
npm install -g verdaccio-stats
```

Or install to verdaccio plugin folder:

```bash
mkdir -p ./install-here/
npm install --global-style \
  --bin-links=false --save=false --package-lock=false \
  --omit=dev --omit=optional --omit=peer \
  --prefix ./install-here/ \
  verdaccio-stats@latest
mv ./install-here/node_modules/verdaccio-stats/ /path/to/verdaccio/plugins/
```

## Configuration

Add the plugin to your Verdaccio config file:

```yaml
middlewares:
  stats:
    enabled: true
    dialect: sqlite # Optional: sqlite, mysql, postgres, mariadb, mssql (default: sqlite)
    database: stats.db # For SQLite: path to database file
    # For other databases, use object configuration:
    # database:
    #   name: verdaccio_stats
    #   username: user         # Or use VERDACCIO_STATS_USERNAME env var
    #   password: pass         # Or use VERDACCIO_STATS_PASSWORD env var
    #   host: localhost
    #   port: 5432
    iso-week: false # Optional, whether to use ISO week format
    count-downloads: true # Optional, whether to count downloads
    count-manifest-views: true # Optional, whether to count manifest views
```

Note: SQLite is the default database type, but for performance reason, it is not recommended for production use. For production, consider using MySQL, PostgreSQL, MariaDB, or MSSQL.

### Configuration Options

| Option                 | Type             | Default           | Description                                                       |
| ---------------------- | ---------------- | ----------------- | ----------------------------------------------------------------- |
| `enabled`              | boolean          | `true`            | Whether the plugin is enabled                                     |
| `dialect`              | string           | `sqlite`          | Database type (`sqlite`, `mysql`, `postgres`, `mariadb`, `mssql`) |
| `database`             | string or object | `stats.db`      | Database configuration                                            |
| `database.name`        | string           | `verdaccio_stats` | Database name                                                     |
| `database.username`    | string           |                   | Database username                                                 |
| `database.password`    | string           |                   | Database password                                                 |
| `database.host`        | string           | `localhost`       | Database host                                                     |
| `database.port`        | number           | `3306`            | Database port                                                     |
| `iso-week`             | boolean          | `false`           | Whether to use ISO week format                                    |
| `count-downloads`      | boolean          | `true`            | Whether to count downloads                                        |
| `count-manifest-views` | boolean          | `true`            | Whether to count manifest views                                   |

## Usage

After installing and configuring the plugin, it will automatically begin collecting the specified statistics. The data will be stored in the configured database file.

You can view the statistics by visiting the following URL:

```
http://your-registry.com/-/web/stats
```

## License

See the [`LICENSE`](LICENSE) file for details.
