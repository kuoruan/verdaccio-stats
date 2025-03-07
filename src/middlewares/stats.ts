import type { Application, Handler, Response } from "express";

import type { ConfigHolder } from "../config";
import type { PluginMiddleware } from "../types";

import { Database } from "../storage/db";
import { wrapPath } from "../utils";

/**
 * NOTE: This middleware is not implemented yet.
 */
export class Stats implements PluginMiddleware {
  private db: Database | null = null;

  constructor(private config: ConfigHolder) {}

  register_middlewares(app: Application): void {
    app.get(wrapPath("/downloads/latest"), this.notImplementedHandler);
    app.get(wrapPath("/downloads/total"), this.notImplementedHandler);
    app.get(wrapPath("/downloads/popular/:count?"), this.notImplementedHandler);
    app.get(wrapPath("/downloads/package/:package/:version?"), this.notImplementedHandler);

    app.get(wrapPath("/manifest/latest"), this.notImplementedHandler);
    app.get(wrapPath("/manifest/total"), this.notImplementedHandler);
    app.get(wrapPath("/manifest/popular/:count?"), this.notImplementedHandler);
    app.get(wrapPath("/manifest/views/package/:package/:version?"), this.notImplementedHandler);
  }

  public setDatabase(db: Database) {
    this.db = db;
  }

  private checkDatabase(db: Database | null, res: Response): db is Database {
    if (!db) {
      res.sendStatus(500).send("Database not set");

      return false;
    }
    return true;
  }

  private notImplementedHandler: Handler = (req, res) => {
    if (!this.checkDatabase(this.db, res)) return;

    res.sendStatus(501).send("Not implemented");
  };
}
