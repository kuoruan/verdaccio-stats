# Copilot instructions (verdaccio-stats)

## Big picture
- This repo is a Verdaccio plugin providing **download** + **manifest view** stats.
- Entry point: `src/index.ts` exports `Plugin` (`src/plugin.ts`) which registers 3 Express middlewares:
  - `Hooks` (`src/middlewares/hooks.ts`): hooks Verdaccio routes and increments stats after responses finish.
  - `UI` (`src/middlewares/ui.ts`): AdminJS UI mounted at `WEB_PATH` (`src/constants.ts`) with a legacy redirect.
  - `Stats` (`src/middlewares/stats.ts`): placeholder API routes (currently returns 501).

## Data flow & boundaries
- **Counting happens in `Hooks`** via `res.once("finish", ...)` and only for success codes (`isSuccessStatus` in `src/utils.ts`).
- Package name handling:
  - scoped routes use `addScope(scope, package)`.
  - tarball version is parsed with `tarballUtils.getVersionFromTarball(filename)`.
- Storage: `Database` (`src/storage/db.ts`) uses Sequelize (sequelize-typescript models in `src/models.ts`) and wraps each increment in a transaction.
- Migrations: Umzug is used; initial migration is defined in `src/migrations.ts` and seeds the “universe package” (`**@*`, see `UNIVERSE_PACKAGE_*` in `src/constants.ts`).

## Configuration conventions
- Config parsing is strict and **process-exits on invalid config** (`ParsedPluginConfig` in `src/config.ts`).
- Dialect defaults to sqlite; non-sqlite requires full `database.{name,username,password,host,port}`.
- Credentials can come from env vars: `VERDACCIO_STATS_USERNAME`, `VERDACCIO_STATS_PASSWORD`.

## UI (AdminJS) conventions
- Admin UI is dynamically imported (`interopDefault` in `src/utils.ts`) and `process.env.ADMIN_JS_SKIP_BUNDLE = "true"` is set.
- `UI` may return `503` until the router is ready; keep async init behavior when changing this.

## Logging & debugging
- Use Verdaccio’s logger via `setLogger(options.logger)` (`src/logger.ts`).
- SQL/Umzug debug output uses `debug` namespace `verdaccio:plugin:${pluginKey}` (`src/debugger.ts`).

## Developer workflows (pnpm)
- Start a local Verdaccio with this plugin: `pnpm start` (uses `verdaccio/verdaccio.yml`).
- Build: `pnpm build` (Rollup emits `lib/` CJS + ESM). NOTE: in `rollup.config.mjs`, keep `exports: "named"` for Verdaccio compatibility.
- Tests: `pnpm test` (Vitest; see `vitest.config.mjs`).
- Lint: `pnpm lint` / `pnpm lint:fix` (flat ESLint config; import ordering enforced by `simple-import-sort`).

## Project-specific coding patterns
- New HTTP endpoints should be mounted under `API_BASE_PATH` using `wrapPath()` (`src/utils.ts`).
- New middlewares should implement `PluginMiddleware` (`src/types.ts`) and be registered in `Plugin.register_middlewares()`.
- Prefer touching source under `src/`; `lib/` is build output.
