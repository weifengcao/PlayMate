import { Model, DataTypes, Sequelize } from 'sequelize';

class PlaydateLocation extends Model {
  public id!: number;
  public name!: string;
  public latitude!: number;
  public longitude!: number;
}

export const initPlaydateLocation = (sequelize: Sequelize) => {
  PlaydateLocation.init(
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
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      tableName: 'playdate_locations',
      sequelize,
    }
  );
};

export default PlaydateLocation;
