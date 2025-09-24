import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { User } from './User';
import type { PlaydateParticipant } from './PlaydateParticipant';

export type PlaydateStatus = 'scheduled' | 'closed';

export interface PlaydateAttributes {
  id: number;
  hostId: number;
  title: string;
  activity: string;
  description: string | null;
  locationName: string;
  startTime: Date;
  endTime: Date;
  status: PlaydateStatus;
  maxGuests: number | null;
  notes: string | null;
}

export type PlaydateCreationAttributes = Optional<
  PlaydateAttributes,
  'id' | 'description' | 'status' | 'maxGuests' | 'notes'
>;

export class Playdate
  extends Model<PlaydateAttributes, PlaydateCreationAttributes>
  implements PlaydateAttributes
{
  declare id: number;
  declare hostId: number;
  declare title: string;
  declare activity: string;
  declare description: string | null;
  declare locationName: string;
  declare startTime: Date;
  declare endTime: Date;
  declare status: PlaydateStatus;
  declare maxGuests: number | null;
  declare notes: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare participants?: PlaydateParticipant[];
  declare host?: User;
}

export const initPlaydate = (sequelize: Sequelize) => {
  Playdate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hostId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: User,
          key: 'id',
        },
        onDelete: 'CASCADE',
        field: 'host_id',
      },
      title: {
        type: new DataTypes.STRING(160),
        allowNull: false,
      },
      activity: {
        type: new DataTypes.STRING(120),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      locationName: {
        type: new DataTypes.STRING(160),
        allowNull: false,
        field: 'location_name',
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_time',
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_time',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      maxGuests: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_guests',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'playdates',
      indexes: [
        {
          fields: ['host_id'],
        },
        {
          fields: ['start_time'],
        },
      ],
    }
  );
};

export const definePlaydateAssociations = () => {
  Playdate.belongsTo(User, { foreignKey: 'hostId', as: 'host', onDelete: 'CASCADE' });
  User.hasMany(Playdate, { foreignKey: 'hostId', as: 'hostedPlaydates', onDelete: 'CASCADE' });
};

export default Playdate;
