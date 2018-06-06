/* eslint new-cap: 0 */

export default function defineTest(sequelize, DataTypes) {
  return sequelize.define(
    'Test2',
    {
      id: {
        type: DataTypes.INTEGER(11).UNSIGNED,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      data: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: 'test2',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      classMethods: {
        associate(models) {
          models.test2.belongsTo(models.test, {
            foreignKey: 'test_id',
          });
        },
      },
    },
  );
}
