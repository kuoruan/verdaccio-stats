import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";

import type { PeriodType, PeriodValue } from "./types";

export abstract class StatsModel<T extends Record<never, never> = any> extends Model<T> {
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
  declare package: Package | null;
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
export class DownloadStats extends StatsModel<DownloadStats> {}

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
export class ManifestViewStats extends StatsModel<ManifestViewStats> {}

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
export class Package extends Model<Package> {
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
  get displayName(): string {
    return `${this.getDataValue("name")}@${this.getDataValue("version")}`;
  }

  @HasMany(() => DownloadStats, { sourceKey: "id", foreignKey: "packageId" })
  declare downloadStats: DownloadStats[];

  @HasMany(() => ManifestViewStats, { sourceKey: "id", foreignKey: "packageId" })
  declare manifestViewStats: ManifestViewStats[];
}
