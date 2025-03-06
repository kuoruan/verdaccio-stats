import buildDebug from "debug";
import { UmzugOptions } from "umzug";

import { pluginKey } from "./constants";

export const debug = buildDebug(`verdaccio:plugin:${pluginKey}`);

export function getUmzugLogger(): UmzugOptions["logger"] {
  return {
    debug: (msg) => debug("umzug:debug: %j", msg),
    error: (msg) => debug("umzug:error: %j", msg),
    info: (msg) => debug("umzug:info: %j", msg),
    warn: (msg) => debug("umzug:warn: %j", msg),
  };
}
