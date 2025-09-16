import { DataTypes, Model, Sequelize } from 'sequelize'
import { User } from './User'

export class Dog extends Model {}

export function initDog(sequelize: Sequelize) {
  Dog.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      breed: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: User, // Reference the User model
          key: 'id',  // The field in User that ownerId references (usually 'id')
        },
        onDelete: 'CASCADE',  // Optional: cascade deletes when a User is deleted
      },    
    },
    { sequelize, modelName: 'dog' }
  )
}

export function defineAssociations() {
  User.hasMany(Dog, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  Dog.belongsTo(User, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
}