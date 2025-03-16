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
const extractTextFromFile = async (filePath: string) => {
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
          content: `你是著名央视财经频道主编，你擅长中美财经信息总结提炼。在用户提交财经资讯时，你快速总结提炼有价值信息。
请以JSON格式返回以下内容：
1. title: 为对话内容生成一个简洁的标题
2. content: 数组格式，包含多个对象，每个对象有两个字段：
   - speaker: 主持人姓名，交替使用"郎咸平"和"李大霄"
   - text: 对应的对话内容
请确保生成的JSON格式正确且易于解析。对话内容应该有条理、专业且富有洞察力。`
        },
        {
          role: "user", 
          content: fileContent
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // 解析响应，生成对话稿
    const responseContent = completion.choices[0].message.content;
    
    let dialogue;
    try {
      // 尝试解析JSON响应
      const parsedResponse = JSON.parse(responseContent || '{}');
      
      // 获取标题
      let title = parsedResponse.title || '财经对话';
      
      // 生成时间戳
      const currentTime = new Date();
      const formattedTime = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDate()} ${currentTime.getHours()}:${currentTime.getMinutes()}`;
      
      // 构建最终的对话结构
      dialogue = {
        title: `${title} ${formattedTime}`,
        speakers: ['郎咸平', '李大霄'],
        content: parsedResponse.content || [],
        createdAt: new Date().toISOString()
      };
      
      // 如果内容为空，添加默认内容
      if (!parsedResponse.content || parsedResponse.content.length === 0) {
        dialogue.content = [{
          speaker: '郎咸平',
          text: responseContent || '无法生成有效内容'
        }];
      }
    } catch (error) {
      console.error('解析JSON响应失败:', error);
      
      // 解析失败时，使用旧方法处理
      const dialogueLines = responseContent?.split('\n').filter(line => line.trim()) || [];
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
          text: responseContent || '无法生成有效内容'
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
      
      dialogue = {
        title: `${title} ${formattedTime}`,
        speakers: ['郎咸平', '李大霄'],
        content: dialogueContent,
        createdAt: new Date().toISOString()
      };
    }
    
    res.status(200).json({
      success: true,
      message: '对话稿生成成功',
      dialogue
    });
    
  } catch (error: unknown) {
    console.error('对话稿生成错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({ success: false, message: '对话稿生成失败: ' + errorMessage });
  }
});

export default router; 