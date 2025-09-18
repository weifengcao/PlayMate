import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/env';

// Define the attributes for the User model
interface UserAttributes {
  id: number;
  name: string;
  password: string;
  email: string;
  playdate_latit: number;
  playdate_longi: number;
  mfaVerified: boolean;
  lastLoginAt: Date | null;
}

// Define a type for optional attributes during creation
interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "mfaVerified" | "lastLoginAt"> {}

// Extend the Sequelize Model class with the attributes
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number; // Non-optional, required for every instance
  declare name: string;
  declare password: string;
  declare email: string;
  declare playdate_latit: number;
  declare playdate_longi: number;
  declare mfaVerified: boolean;
  declare lastLoginAt: Date | null;

  // Timestamps (optional, depending on your configuration)
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
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
      mfaVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    { sequelize, modelName: 'user' }
  )
}

export function generateAccessJWT(user: User) {
  let payload = {
    id: user.id,
  };
  return jwt.sign(payload, appConfig.jwtSecret, {
    expiresIn: '20m',
  });
}
