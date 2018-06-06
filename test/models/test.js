/* eslint new-cap: 0 */

export default function defineTest(sequelize, DataTypes) {
  return sequelize.define(
    'Test',
    {
      id: {
        type: DataTypes.INTEGER(11).UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: 'test',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      classMethods: {
        associate(models) {
          models.test.hasMany(models.test2, {
            foreignKey: 'test_id',
          });
        },
      },
    },
  );
}
