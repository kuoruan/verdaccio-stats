import {
  Association,
  type CreationOptional,
  type ForeignKey,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManyCountAssociationsMixin,
  type HasManyCreateAssociationMixin,
  type HasManyGetAssociationsMixin,
  type HasManyHasAssociationMixin,
  type HasManyHasAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type HasManyRemoveAssociationsMixin,
  type HasManySetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  type NonAttribute,
} from "sequelize";

import type { PeriodType, PeriodValue } from "./types";

export class StatsModel<T extends Model = Model> extends Model<InferAttributes<T>, InferCreationAttributes<T>> {
  declare id: CreationOptional<number>;
  declare count: number;
  declare packageId: ForeignKey<Package["id"]>;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;

  declare package?: NonAttribute<Package>;
}

export class DownloadStats extends StatsModel<DownloadStats> {}

export class ManifestViewStats extends StatsModel<ManifestViewStats> {}

export class Package extends Model<
  InferAttributes<Package, { omit: "downloadStats" | "manifestViewStats" }>,
  InferCreationAttributes<Package, { omit: "downloadStats" | "manifestViewStats" }>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare version: string;

  // displayName is a virtual property that combines name and version
  declare readonly displayName: string;

  declare downloadStats?: NonAttribute<DownloadStats[]>;
  declare manifestViewStats?: NonAttribute<ManifestViewStats[]>;

  declare getDownloadStats: HasManyGetAssociationsMixin<DownloadStats>;
  declare countDownloadStats: HasManyCountAssociationsMixin;
  declare hasDownloadStat: HasManyHasAssociationMixin<DownloadStats, number>;
  declare hasDownloadStats: HasManyHasAssociationsMixin<DownloadStats, number>;
  declare setDownloadStats: HasManySetAssociationsMixin<DownloadStats, number>;
  declare addDownloadStat: HasManyAddAssociationMixin<DownloadStats, number>;
  declare addDownloadStats: HasManyAddAssociationsMixin<DownloadStats, number>;
  declare removeDownloadStat: HasManyRemoveAssociationMixin<DownloadStats, number>;
  declare removeDownloadStats: HasManyRemoveAssociationsMixin<DownloadStats, number>;
  declare createDownloadStat: HasManyCreateAssociationMixin<DownloadStats, "packageId">;

  declare getManifestViewStats: HasManyGetAssociationsMixin<ManifestViewStats>;
  declare countManifestViewStats: HasManyCountAssociationsMixin;
  declare hasManifestViewStat: HasManyHasAssociationMixin<ManifestViewStats, number>;
  declare hasManifestViewStats: HasManyHasAssociationsMixin<ManifestViewStats, number>;
  declare setManifestViewStats: HasManySetAssociationsMixin<ManifestViewStats, number>;
  declare addManifestViewStat: HasManyAddAssociationMixin<ManifestViewStats, number>;
  declare addManifestViewStats: HasManyAddAssociationsMixin<ManifestViewStats, number>;
  declare removeManifestViewStat: HasManyRemoveAssociationMixin<ManifestViewStats, number>;
  declare removeManifestViewStats: HasManyRemoveAssociationsMixin<ManifestViewStats, number>;
  declare createManifestViewStat: HasManyCreateAssociationMixin<ManifestViewStats, "packageId">;

  declare static associations: {
    downloadStats: Association<Package, DownloadStats>;
    manifestViewStats: Association<Package, ManifestViewStats>;
  };
}
