import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './config/database';

// 加载环境变量
dotenv.config();

// 导入路由
import documentRoutes from './routes/documentRoutes';
import voiceRoutes from './routes/voiceRoutes';
import ttsRoutes from './routes/ttsRoutes';
import dialogueRoutes from './routes/dialogueRoutes';

const app = express();
const PORT = 5001;  // 固定端口为5001

// 初始化数据库（但不阻止服务器启动）
initDatabase()
  .then(() => {
    console.log('数据库初始化成功');
  })
  .catch(error => {
    console.warn('数据库初始化失败，但服务器将继续启动:', error);
    console.log('注意: 将使用文件系统作为临时存储方案');
  });

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../uploads');
const generatedDir = path.join(__dirname, '../generated');
try {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
  require('fs').mkdirSync(generatedDir, { recursive: true });
} catch (err) {
  console.error('创建目录失败:', err);
}

// 静态文件目录
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/generated', express.static(path.join(__dirname, '../generated')));

// 路由
app.use('/api/documents', documentRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/dialogues', dialogueRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 