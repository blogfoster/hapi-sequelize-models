/* eslint new-cap: 0 */

export default function defineTest(sequelize, DataTypes) {
  return sequelize.define('Xxx', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    }
  }, {
    tableName: 'xxx',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
}
