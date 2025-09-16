import { DataTypes, Model, Sequelize } from 'sequelize'
import { User } from './User'

export class FriendLink extends Model {
  public id!: number;
  public askerId!: number;
  public receiverId!: number;
  public state!: number;

  // Add optional receiver and asker properties for TypeScript
  public receiver?: User;
  public asker?: User;
}

export function initFriendLink(sequelize: Sequelize) {
  FriendLink.init(
    {
      askerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: User,
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: User,
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      state: {
        // Possible values:
        // - 0: asked for a friendship, but the receiver did not answered.
        // - 1: the receiver accepted the friendship.
        // - 2: the receiver refused the friendship.
        type: DataTypes.INTEGER,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'friendlink',
      indexes: [{
          unique: true,
          // Composite unique constraint
          fields: ['askerId', 'receiverId']
      }]
    }
  )
}

export function defineAssociations() {
  User.hasMany(FriendLink, { foreignKey: 'askerId', onDelete: 'CASCADE' });
  FriendLink.belongsTo(User,
    { foreignKey: 'askerId', as: 'asker', onDelete: 'CASCADE' }
  );
  User.hasMany(FriendLink, { foreignKey: 'receiverId', onDelete: 'CASCADE' });
  FriendLink.belongsTo(User,
    { foreignKey: 'receiverId', as: 'receiver', onDelete: 'CASCADE' }
  );
}