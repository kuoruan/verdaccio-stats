import {
  CreationOptional,
  ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";

import type { PeriodType, PeriodValue } from "./types";

export class DownloadStats extends Model<InferAttributes<DownloadStats>, InferCreationAttributes<DownloadStats>> {
  declare count: number;
  declare id: CreationOptional<number>;
  declare package?: NonAttribute<Package>;
  declare packageId: ForeignKey<Package["id"]>;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;
}

export class ManifestViewStats extends Model<
  InferAttributes<ManifestViewStats>,
  InferCreationAttributes<ManifestViewStats>
> {
  declare count: number;
  declare id: CreationOptional<number>;
  declare package?: NonAttribute<Package>;
  declare packageId: ForeignKey<Package["id"]>;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;
}

export class Package extends Model<InferAttributes<Package>, InferCreationAttributes<Package>> {
  declare readonly displayName: string;
  declare id: CreationOptional<number>;
  declare name: string;
  declare version: string;
}
