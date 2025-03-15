import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// 数据库配置
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'podcast_db',
  logging: false,
  define: {
    timestamps: true
  }
});

export const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    await sequelize.sync({ alter: true });
    console.log('数据表同步成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
};

export default sequelize; 