import express from 'express';
import Dialogue from '../models/Dialogue';

const router = express.Router();

// 获取所有对话稿列表
router.get('/', async (req, res) => {
  try {
    const dialogues = await Dialogue.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      dialogues
    });
  } catch (error) {
    console.error('获取对话稿列表错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取对话稿列表失败' 
    });
  }
});

// 获取单个对话稿
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const dialogue = await Dialogue.findByPk(id);
    
    if (!dialogue) {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      dialogue
    });
  } catch (error) {
    console.error('获取对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取对话稿失败' 
    });
  }
});

// 保存对话稿
router.post('/', async (req, res) => {
  try {
    const { title, speakers, content } = req.body;
    
    if (!title || !speakers || !content) {
      res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
      return;
    }
    
    const dialogue = await Dialogue.create({
      title,
      speakers,
      content
    });
    
    res.status(201).json({
      success: true,
      message: '对话稿保存成功',
      dialogue
    });
  } catch (error) {
    console.error('保存对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '保存对话稿失败' 
    });
  }
});

// 更新对话稿
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, speakers, content } = req.body;
    
    const dialogue = await Dialogue.findByPk(id);
    
    if (!dialogue) {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
      return;
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
  } catch (error) {
    console.error('更新对话稿错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新对话稿失败' 
    });
  }
});

// 删除对话稿
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const dialogue = await Dialogue.findByPk(id);
    
    if (!dialogue) {
      res.status(404).json({ 
        success: false, 
        message: '对话稿不存在' 
      });
      return;
    }
    
    await dialogue.destroy();
    
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