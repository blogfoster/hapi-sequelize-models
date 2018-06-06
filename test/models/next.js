/* eslint new-cap: 0 */

export default function defineNext(sequelize, DataTypes) {
  return sequelize.define(
    'Next',
    {
      id: {
        type: DataTypes.INTEGER(11).UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
    },
    {
      tableName: 'next',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
}
