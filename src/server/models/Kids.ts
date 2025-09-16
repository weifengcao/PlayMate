import { Model, DataTypes, Sequelize } from 'sequelize';

class Kid extends Model {
  public id!: number;
  public name!: string;
  public breed!: string;
  public age!: number;
  public ownerId!: number;
}

export const initKid = (sequelize: Sequelize) => {
  Kid.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: new DataTypes.STRING(128),
        allowNull: false,
      },
      breed: {
        type: new DataTypes.STRING(128),
        allowNull: false,
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'kids',
      sequelize,
    }
  );
};

export default Kid;
