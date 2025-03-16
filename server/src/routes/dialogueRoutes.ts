import express from 'express';
import Dialogue from '../models/Dialogue';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DIALOGUES_DIR = path.join(__dirname, '../../uploads/dialogues');

// 确保目录存在
try {
  if (!fs.existsSync(DIALOGUES_DIR)) {
    fs.mkdirSync(DIALOGUES_DIR, { recursive: true });
  }
} catch (error) {
  console.error('创建对话稿存储目录失败:', error);
}

// 添加一个简单的测试路由
router.get('/test', (req, res) => {
  console.log('收到测试请求');
  res.status(200).json({
    success: true,
    message: '对话稿API测试成功',
    timestamp: new Date().toISOString()
  });
});

// 临时获取所有对话稿（文件系统版本）
router.get('/', async (req, res) => {
  try {
    // 尝试使用数据库
    try {
      const dialogues = await Dialogue.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      res.status(200).json({
        success: true,
        dialogues
      });
      return;
    } catch (dbError) {
      console.warn('数据库查询失败，使用文件系统:', dbError);
    }
    
    // 使用文件系统备选方案
    if (fs.existsSync(DIALOGUES_DIR)) {
      const files = fs.readdirSync(DIALOGUES_DIR);
      const dialogues = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const content = fs.readFileSync(path.join(DIALOGUES_DIR, file), 'utf-8');
          try {
            const dialogue = JSON.parse(content);
            return dialogue;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
      
      res.status(200).json({
        success: true,
        dialogues
      });
    } else {
      res.status(200).json({
        success: true,
        dialogues: []
      });
    }
  } catch (error) {
    console.error('获取对话稿列表错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取对话稿列表失败' 
    });
  }
});

// 临时获取单个对话稿
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试使用数据库
    try {
      const dialogue = await Dialogue.findByPk(id);
      
      if (!dialogue) {
        // 数据库没有找到，尝试文件系统
        throw new Error('对话稿不存在于数据库中');
      }
      
      res.status(200).json({
        success: true,
        dialogue
      });
      return;
    } catch (dbError) {
      console.warn('数据库查询失败，使用文件系统:', dbError);
    }
    
    // 使用文件系统备选方案
    const filePath = path.join(DIALOGUES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dialogue = JSON.parse(content);
      
      res.status(200).json({
        success: true,
        dialogue
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
    }
  } catch (error) {
    console.error('获取对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取对话稿失败' 
    });
  }
});

// 临时保存对话稿
router.post('/', async (req, res) => {
  try {
    console.log('收到保存对话稿请求:', req.body);
    const { title, speakers, content } = req.body;
    
    if (!title || !speakers || !content) {
      console.error('缺少必要参数:', { title, speakers, contentLength: content?.length });
      res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
      return;
    }
    
    // 尝试使用数据库
    let dialogue;
    try {
      console.log('尝试保存到数据库...');
      dialogue = await Dialogue.create({
        title,
        speakers,
        content
      });
      
      console.log('数据库保存成功:', dialogue.id);
      res.status(201).json({
        success: true,
        message: '对话稿保存成功',
        dialogue
      });
      return;
    } catch (dbError) {
      console.warn('数据库保存失败，使用文件系统:', dbError);
    }
    
    // 确保目录存在
    if (!fs.existsSync(DIALOGUES_DIR)) {
      console.log('创建对话稿目录:', DIALOGUES_DIR);
      fs.mkdirSync(DIALOGUES_DIR, { recursive: true });
    }
    
    // 使用文件系统备选方案
    const id = Date.now();
    dialogue = {
      id,
      title,
      speakers,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const filePath = path.join(DIALOGUES_DIR, `${id}.json`);
    console.log('保存对话稿到文件系统:', filePath);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(dialogue, null, 2));
      console.log('文件系统保存成功');
      
      res.status(201).json({
        success: true,
        message: '对话稿保存成功(文件系统)',
        dialogue
      });
    } catch (fsError: any) {
      console.error('文件系统保存失败:', fsError);
      res.status(500).json({
        success: false,
        message: '文件系统保存失败: ' + (fsError.message || '未知错误')
      });
    }
  } catch (error: any) {
    console.error('保存对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '保存对话稿失败: ' + (error.message || '未知错误') 
    });
  }
});

// 临时更新对话稿
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, speakers, content } = req.body;
    
    // 尝试使用数据库
    try {
      const dialogue = await Dialogue.findByPk(id);
      
      if (!dialogue) {
        // 数据库没有找到，尝试文件系统
        throw new Error('对话稿不存在于数据库中');
      }
      
      await dialogue.update({
        title,
        speakers,
        content
      });
      
      res.status(200).json({
        success: true,
        message: '对话稿更新成功',
        dialogue
      });
      return;
    } catch (dbError) {
      console.warn('数据库更新失败，使用文件系统:', dbError);
    }
    
    // 使用文件系统备选方案
    const filePath = path.join(DIALOGUES_DIR, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
      return;
    }
    
    const dialogueFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const updatedDialogue = {
      ...dialogueFile,
      title,
      speakers,
      content,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedDialogue, null, 2));
    
    res.status(200).json({
      success: true,
      message: '对话稿更新成功',
      dialogue: updatedDialogue
    });
  } catch (error) {
    console.error('更新对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新对话稿失败' 
    });
  }
});

// 临时删除对话稿
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试使用数据库
    try {
      const dialogue = await Dialogue.findByPk(id);
      
      if (!dialogue) {
        // 数据库没有找到，尝试文件系统
        throw new Error('对话稿不存在于数据库中');
      }
      
      await dialogue.destroy();
      
      res.status(200).json({
        success: true,
        message: '对话稿删除成功'
      });
      return;
    } catch (dbError) {
      console.warn('数据库删除失败，使用文件系统:', dbError);
    }
    
    // 使用文件系统备选方案
    const filePath = path.join(DIALOGUES_DIR, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
      return;
    }
    
    fs.unlinkSync(filePath);
    
    res.status(200).json({
      success: true,
      message: '对话稿删除成功'
    });
  } catch (error) {
    console.error('删除对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '删除对话稿失败' 
    });
  }
});

export default router; 