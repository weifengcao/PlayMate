import { Model, DataTypes, Sequelize } from 'sequelize';
import { User } from './User';

export class Kid extends Model {
  declare id: number;
  declare name: string;
  declare favoriteActivity: string;
  declare age: number;
  declare guardianId: number;
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
      favoriteActivity: {
        type: new DataTypes.STRING(128),
        allowNull: false,
        field: 'favorite_activity',
        defaultValue: 'Playground fun',
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      guardianId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'guardian_id',
        references: {
          model: User,
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      tableName: 'kids',
      sequelize,
    }
  );

  Kid.beforeValidate((kid) => {
    const anyKid = kid as any;
    if (anyKid.ownerId && !anyKid.guardianId) {
      anyKid.guardianId = anyKid.ownerId;
    }
    if (anyKid.breed && !anyKid.favoriteActivity) {
      anyKid.favoriteActivity = anyKid.breed;
    }
  });
};

export const defineKidAssociations = () => {
  User.hasMany(Kid, { foreignKey: 'guardianId', onDelete: 'CASCADE' });
  Kid.belongsTo(User, { foreignKey: 'guardianId', onDelete: 'CASCADE' });
};

export default Kid;
