import type { InferAttributes, InferCreationAttributes, NonAttribute } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";

import type { PeriodType, PeriodValue } from "./types";

export abstract class StatsModel extends Model<InferAttributes<StatsModel>, InferCreationAttributes<StatsModel>> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare count: number;

  @ForeignKey(() => Package)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare packageId: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  declare periodType: PeriodType;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  declare periodValue: PeriodValue;

  @BelongsTo(() => Package, {
    targetKey: "id",
    foreignKey: "packageId",
  })
  declare package: NonAttribute<Package>;
}

@Table({
  tableName: "download_stats",
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: "download_stats_index",
      fields: ["package_id", "period_type", "period_value"],
    },
  ],
})
export class DownloadStats extends StatsModel {}

@Table({
  tableName: "manifest_view_stats",
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: "manifest_view_stats_index",
      fields: ["package_id", "period_type", "period_value"],
    },
  ],
})
export class ManifestViewStats extends StatsModel {}

@Table({
  tableName: "packages",
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: "packages_index",
      fields: ["name", "version"],
      unique: true,
    },
  ],
})
export class Package extends Model<InferAttributes<Package>, InferCreationAttributes<Package>> {
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare version: string;

  // displayName is a virtual property that combines name and version
  @Column(DataType.VIRTUAL(DataType.STRING, ["name", "version"]))
  get displayName(): NonAttribute<string> {
    return `${this.getDataValue("name")}@${this.getDataValue("version")}`;
  }

  @HasMany(() => DownloadStats, { sourceKey: "id", foreignKey: "packageId" })
  declare downloadStats: NonAttribute<DownloadStats[]>;

  @HasMany(() => ManifestViewStats, { sourceKey: "id", foreignKey: "packageId" })
  declare manifestViewStats: NonAttribute<ManifestViewStats[]>;
}
