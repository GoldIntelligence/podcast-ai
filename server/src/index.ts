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

// 初始化数据库
initDatabase();

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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