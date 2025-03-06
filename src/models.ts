import { type InferAttributes, type InferCreationAttributes, Model } from "sequelize";

import type { PeriodType, PeriodValue } from "./types";

export class DownloadStats extends Model<InferAttributes<DownloadStats>, InferCreationAttributes<DownloadStats>> {
  declare count: number;
  declare id: number;
  declare packageId: number;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;
}

export class ManifestViewStats extends Model<
  InferAttributes<ManifestViewStats>,
  InferCreationAttributes<ManifestViewStats>
> {
  declare count: number;
  declare id: number;
  declare packageId: number;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;
}

export class Package extends Model<InferAttributes<Package>, InferCreationAttributes<Package>> {
  declare id: number;
  declare name: string;
  declare version: string;
}
