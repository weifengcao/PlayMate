import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import jwt from 'jsonwebtoken';

// TODO : put that in an env var, or in a common config file.
const SECRET_ACCESS_TOKEN = 'abcdef0123456789';

// Define the attributes for the User model
interface UserAttributes {
  id: number;
  name: string;
  password: string;
  email: string;
  playdate_latit: number;
  playdate_longi: number;
}

// Define a type for optional attributes during creation
interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

// Extend the Sequelize Model class with the attributes
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number; // Non-optional, required for every instance
  public name!: string;
  public password!: string;
  public email!: string;
  public playdate_latit!: number;
  public playdate_longi!: number;

  // Timestamps (optional, depending on your configuration)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}


export function initUser(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      playdate_latit: {
        type: DataTypes.FLOAT,
      },
      playdate_longi: {
        type: DataTypes.FLOAT,
      },
    },
    { sequelize, modelName: 'user' }
  )
}

export function generateAccessJWT(user: User) {
  let payload = {
    id: user.id,
  };
  return jwt.sign(payload, SECRET_ACCESS_TOKEN, {
    expiresIn: '20m',
  });
}
