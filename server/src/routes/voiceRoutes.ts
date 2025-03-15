import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// 配置音频文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/voices'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg') {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。请上传 MP3 格式的音频文件。'));
    }
  }
});

// 上传声音样本
router.post('/upload', upload.single('audioSample'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '未提供音频文件' });
      return;
    }
    
    // 获取对应的文本
    const { transcription } = req.body;
    if (!transcription) {
      res.status(400).json({ success: false, message: '未提供对应的文本' });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      message: '音频样本上传成功',
      file: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        transcription
      }
    });
  } catch (error) {
    console.error('音频上传错误:', error);
    res.status(500).json({ success: false, message: '音频上传失败' });
  }
});

// 克隆音色
router.post('/clone', (req, res) => {
  try {
    const { audioPath, transcription, voiceName } = req.body;
    
    if (!audioPath || !transcription || !voiceName) {
      res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
      return;
    }
    
    // TODO: 调用音色克隆API
    // 这里应该实现调用音色克隆API的逻辑
    
    // 模拟克隆进度响应
    let progress = 0;
    const taskId = Date.now().toString();
    
    // 返回任务ID，前端可以用来查询进度
    res.status(202).json({
      success: true,
      message: '音色克隆任务已提交',
      taskId
    });
    
  } catch (error) {
    console.error('音色克隆错误:', error);
    res.status(500).json({ success: false, message: '音色克隆请求失败' });
  }
});

// 查询克隆进度
router.get('/progress/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  // TODO: 实际应该从数据库查询任务进度
  // 这里使用模拟数据
  const progress = Math.min(100, Math.floor(Math.random() * 100));
  
  res.status(200).json({
    success: true,
    taskId,
    progress,
    status: progress < 100 ? 'processing' : 'completed',
    voiceId: progress === 100 ? `voice_${taskId}` : null,
    estimatedTimeRemaining: progress < 100 ? Math.floor((100 - progress) / 10) : 0
  });
});

// 获取所有音色
router.get('/all', (req, res) => {
  // TODO: 从数据库获取用户所有的克隆音色
  // 模拟数据
  const voices = [
    { id: 'voice_1', name: '默认男声', type: 'system' },
    { id: 'voice_2', name: '默认女声', type: 'system' },
    { id: 'voice_3', name: '我的音色1', type: 'cloned', createdAt: new Date().toISOString() }
  ];
  
  res.status(200).json({
    success: true,
    voices
  });
});

export default router; 