# Verdaccio Stats Plugin

This plugin adds detailed statistics functionality to your Verdaccio private npm registry.

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
    file: ./stats.db        # Optional, SQLite database
    iso-week: false         # Optional, whether to use ISO week format
    count-downloads: true   # Optional, whether to count downloads
    count-manifest-views: true  # Optional, whether to count manifest views
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `file` | string | `stats.db` | Path to the file where stats are stored |
| `iso-week` | boolean | `false` | Whether to use ISO week format |
| `count-downloads` | boolean | `true` | Whether to count downloads |
| `count-manifest-views` | boolean | `true` | Whether to count manifest views |

## Usage

After installing and configuring the plugin, it will automatically begin collecting the specified statistics. The data will be stored in the configured database file.

You can view the statistics by visiting the following URL:

```
http://your-registry.com/-/verdaccio/stats/ui
```

## License

See the [`LICENSE`](LICENSE ) file for details.
