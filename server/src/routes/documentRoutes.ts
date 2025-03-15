import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { OpenAI } from 'openai';

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/documents'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。请上传 PDF, DOCX 或 TXT 文件。'));
    }
  }
});

// 上传文档
router.post('/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '未提供文件' });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      message: '文件上传成功',
      file: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ success: false, message: '文件上传失败' });
  }
});

// 从文件中提取文本内容
const extractTextFromFile = async (filePath) => {
  try {
    // 简单实现，仅支持txt文件
    // 实际项目中应该使用pdf.js和mammoth等库支持PDF和DOCX格式
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error('提取文本错误:', error);
    throw new Error('文件内容提取失败');
  }
};

// 文档总结生成对话稿
router.post('/summarize', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      res.status(400).json({ success: false, message: '未提供文件路径' });
      return;
    }
    
    // 提取文件内容
    const fileContent = await extractTextFromFile(filePath);
    
    // 调用OpenAI API
    const client = new OpenAI({
      apiKey: process.env.LLM_API_KEY || "STEP_API_KEY", 
      baseURL: process.env.LLM_API_ENDPOINT || "https://api.stepfun.com/v1"
    });
    
    const completion = await client.chat.completions.create({
      model: "step-1-8k",
      messages: [
        {
          role: "system",
          content: "你是著名央视财经频道主编，你擅长中美财经信息总结提炼。在用户提交财经资讯时，你快速总结提炼有价值信息，同时，生成A（模拟郎咸平） B（模拟李大霄）两个主持人的播客对话稿件"
        },
        {
          role: "user", 
          content: fileContent
        }
      ]
    });
    
    // 解析响应，生成对话稿
    const responseContent = completion.choices[0].message.content;
    
    // 提取对话内容并格式化
    // 这里假设模型返回的内容格式为 "A: 内容" 和 "B: 内容" 交替出现
    const dialogueLines = responseContent.split('\n').filter(line => line.trim());
    const dialogueContent = [];
    
    for (const line of dialogueLines) {
      if (line.startsWith('A:')) {
        dialogueContent.push({
          speaker: '郎咸平',
          text: line.substring(2).trim()
        });
      } else if (line.startsWith('B:')) {
        dialogueContent.push({
          speaker: '李大霄',
          text: line.substring(2).trim()
        });
      }
    }
    
    // 如果没有成功提取对话内容，使用完整的响应内容
    if (dialogueContent.length === 0) {
      dialogueContent.push({
        speaker: '郎咸平',
        text: responseContent
      });
    }
    
    // 生成标题和时间
    const currentTime = new Date();
    const formattedTime = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDate()} ${currentTime.getHours()}:${currentTime.getMinutes()}`;
    
    // 从内容中提取可能的标题
    let title = '财经对话';
    const firstLine = dialogueLines[0];
    if (firstLine && !firstLine.startsWith('A:') && !firstLine.startsWith('B:')) {
      title = firstLine;
    }
    
    const dialogue = {
      title: `${title} ${formattedTime}`,
      speakers: ['郎咸平', '李大霄'],
      content: dialogueContent,
      createdAt: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      message: '对话稿生成成功',
      dialogue
    });
    
  } catch (error) {
    console.error('对话稿生成错误:', error);
    res.status(500).json({ success: false, message: '对话稿生成失败: ' + error.message });
  }
});

export default router; 