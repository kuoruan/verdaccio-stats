import type { Application } from "express";

import type { PERIOD_TYPES, PERIOD_VALUE_TOTAL } from "./constants";

export type PeriodType = (typeof PERIOD_TYPES)[number];

export type PeriodValue = (Record<never, never> & string) | typeof PERIOD_VALUE_TOTAL;

export interface PluginMiddleware {
  register_middlewares(app: Application): void;
}
