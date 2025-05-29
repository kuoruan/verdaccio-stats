import {
  Association,
  CreationOptional,
  ForeignKey,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";

import type { PeriodType, PeriodValue } from "./types";

export class DownloadStats extends Model<InferAttributes<DownloadStats>, InferCreationAttributes<DownloadStats>> {
  declare id: CreationOptional<number>;
  declare count: number;
  declare packageId: ForeignKey<Package["id"]>;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;

  declare package?: NonAttribute<Package>;
}

export class ManifestViewStats extends Model<
  InferAttributes<ManifestViewStats>,
  InferCreationAttributes<ManifestViewStats>
> {
  declare id: CreationOptional<number>;
  declare count: number;
  declare packageId: ForeignKey<Package["id"]>;
  declare periodType: PeriodType;
  declare periodValue: PeriodValue;

  declare package?: NonAttribute<Package>;
}

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
  declare addDownloadStats: HasManyAddAssociationMixin<DownloadStats, number>;
  declare addDownloadStatsByList: HasManyAddAssociationsMixin<DownloadStats, number>;
  declare setDownloadStats: HasManySetAssociationsMixin<DownloadStats, number>;
  declare removeDownloadStats: HasManyRemoveAssociationMixin<DownloadStats, number>;
  declare removeDownloadStatsByList: HasManyRemoveAssociationsMixin<DownloadStats, number>;
  declare hasDownloadStats: HasManyHasAssociationMixin<DownloadStats, number>;
  declare hasDownloadStatsByList: HasManyHasAssociationsMixin<DownloadStats, number>;
  declare countDownloadStats: HasManyCountAssociationsMixin;
  declare createDownloadStats: HasManyCreateAssociationMixin<DownloadStats, "packageId">;

  declare addManifestViewStats: HasManyAddAssociationMixin<ManifestViewStats, number>;
  declare addManifestViewStatsByList: HasManyAddAssociationsMixin<ManifestViewStats, number>;
  declare getManifestViewStats: HasManyGetAssociationsMixin<ManifestViewStats>;
  declare setManifestViewStats: HasManySetAssociationsMixin<ManifestViewStats, number>;
  declare removeManifestViewStats: HasManyRemoveAssociationMixin<ManifestViewStats, number>;
  declare removeManifestViewStatsByList: HasManyRemoveAssociationsMixin<ManifestViewStats, number>;
  declare hasManifestViewStats: HasManyHasAssociationMixin<ManifestViewStats, number>;
  declare hasManifestViewStatsByList: HasManyHasAssociationsMixin<ManifestViewStats, number>;
  declare countManifestViewStats: HasManyCountAssociationsMixin;
  declare createManifestViewStats: HasManyCreateAssociationMixin<ManifestViewStats, "packageId">;

  declare static associations: {
    downloadStats: Association<Package, DownloadStats>;
    manifestViewStats: Association<Package, ManifestViewStats>;
  };
}
