import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface DialogueContent {
  speaker: string;
  text: string;
}

interface DialogueAttributes {
  id?: number;
  title: string;
  speakers: string[];
  content: DialogueContent[];
  createdAt?: Date;
  updatedAt?: Date;
}

class Dialogue extends Model<DialogueAttributes> implements DialogueAttributes {
  public id!: number;
  public title!: string;
  public speakers!: string[];
  public content!: DialogueContent[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Dialogue.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    speakers: {
      type: DataTypes.JSON,
      allowNull: false
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'dialogues',
    timestamps: true
  }
);

export default Dialogue; 