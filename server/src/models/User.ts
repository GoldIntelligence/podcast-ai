import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/database';

interface UserAttributes {
  id?: number;
  username: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserInstance extends Model<UserAttributes, UserAttributes>, UserAttributes {
  comparePassword(password: string): Promise<boolean>;
}

const User = sequelize.define<UserInstance>(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: UserInstance) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user: UserInstance) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    }
  }
);

// 将实例方法直接添加到模型的prototype上，以兼容Sequelize和TypeScript
(User as any).prototype.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default User; 