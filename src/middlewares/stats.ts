import type { Application, Handler } from "express";

import type { ConfigHolder } from "../config";
import { Database } from "../storage/db";
import type { PluginMiddleware } from "../types";
import { wrapPath } from "../utils";

/**
 * NOTE: This middleware is not implemented yet.
 */
export class Stats implements PluginMiddleware {
  constructor(
    private config: ConfigHolder,
    private db: Database,
  ) {}

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

  private notImplementedHandler: Handler = (req, res) => {
    res.sendStatus(501).send("Not implemented");
  };
}
