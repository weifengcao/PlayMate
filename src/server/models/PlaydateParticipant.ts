import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { User } from './User';
import { Playdate } from './Playdate';

export type PlaydateParticipantRole = 'host' | 'guest';
export type PlaydateParticipantStatus = 'pending' | 'approved' | 'rejected' | 'left';

export interface PlaydateParticipantAttributes {
  id: number;
  playdateId: number;
  userId: number;
  role: PlaydateParticipantRole;
  status: PlaydateParticipantStatus;
  joinedAt: Date | null;
  decisionNote: string | null;
}

export type PlaydateParticipantCreationAttributes = Optional<
  PlaydateParticipantAttributes,
  'id' | 'status' | 'joinedAt' | 'decisionNote'
>;

export class PlaydateParticipant
  extends Model<PlaydateParticipantAttributes, PlaydateParticipantCreationAttributes>
  implements PlaydateParticipantAttributes
{
  declare id: number;
  declare playdateId: number;
  declare userId: number;
  declare role: PlaydateParticipantRole;
  declare status: PlaydateParticipantStatus;
  declare joinedAt: Date | null;
  declare decisionNote: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare playdate?: Playdate;
  declare user?: User;
}

export const initPlaydateParticipant = (sequelize: Sequelize) => {
  PlaydateParticipant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      playdateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: Playdate,
          key: 'id',
        },
        onDelete: 'CASCADE',
        field: 'playdate_id',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: User,
          key: 'id',
        },
        onDelete: 'CASCADE',
        field: 'user_id',
      },
      role: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'guest',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'pending',
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'joined_at',
      },
      decisionNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'decision_note',
      },
    },
    {
      sequelize,
      tableName: 'playdate_participants',
      indexes: [
        {
          fields: ['playdate_id'],
        },
        {
          fields: ['user_id'],
        },
        {
          unique: true,
          fields: ['playdate_id', 'user_id'],
        },
      ],
    }
  );
};

export const definePlaydateParticipantAssociations = () => {
  PlaydateParticipant.belongsTo(Playdate, { foreignKey: 'playdateId', as: 'playdate', onDelete: 'CASCADE' });
  PlaydateParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
  Playdate.hasMany(PlaydateParticipant, { foreignKey: 'playdateId', as: 'participants', onDelete: 'CASCADE' });
  User.hasMany(PlaydateParticipant, { foreignKey: 'userId', as: 'playdateMemberships', onDelete: 'CASCADE' });
};

export default PlaydateParticipant;
