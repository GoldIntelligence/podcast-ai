import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Select, List, Space, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloudUploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph } = Typography;

interface DialogueContent {
  speaker: string;
  text: string;
  displayed?: string; // 用于打字机效果
  isTyping?: boolean; // 是否正在打字
}

interface Dialogue {
  id?: number;
  title: string;
  speakers: string[];
  content: DialogueContent[];
  createdAt?: string;
}

interface ScriptEditorProps {
  dialogue: Dialogue;
  onDialogueChange: (dialogue: Dialogue) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ dialogue, onDialogueChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentDialogue, setCurrentDialogue] = useState<Dialogue>(dialogue);
  const [currentItem, setCurrentItem] = useState<DialogueContent>({ speaker: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const typingTimersRef = useRef<NodeJS.Timeout[]>([]);
  
  // 在组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  useEffect(() => {
    // 初始化带有显示文本和打字标志的对话内容
    const enhancedContent = dialogue.content.map(item => ({
      ...item,
      displayed: '',
      isTyping: false
    }));
    
    const enhancedDialogue = {
      ...dialogue,
      content: enhancedContent
    };
    
    setCurrentDialogue(enhancedDialogue);
    
    // 开始打字效果
    startTypingEffect(enhancedDialogue);
  }, [dialogue]);

  // 打字机效果
  const startTypingEffect = (enhancedDialogue: Dialogue) => {
    // 清除所有现有的定时器
    typingTimersRef.current.forEach(timer => clearTimeout(timer));
    typingTimersRef.current = [];
    
    // 为每一条对话内容创建打字效果
    enhancedDialogue.content.forEach((item, index) => {
      const text = item.text;
      let currentPos = 0;
      
      // 设置正在打字的状态
      const newContent = [...enhancedDialogue.content];
      newContent[index] = { ...newContent[index], isTyping: true };
      setCurrentDialogue(prev => ({
        ...prev,
        content: newContent
      }));
      
      // 逐字显示文本
      const intervalTime = 30; // 每个字符的延迟时间
      
      const typeNextChar = () => {
        if (currentPos < text.length) {
          const newContent = [...enhancedDialogue.content];
          newContent[index] = {
            ...newContent[index],
            displayed: text.substring(0, currentPos + 1)
          };
          
          setCurrentDialogue(prev => ({
            ...prev,
            content: newContent
          }));
          
          currentPos++;
          
          // 继续打字
          const timer = setTimeout(typeNextChar, intervalTime);
          typingTimersRef.current.push(timer);
        } else {
          // 打字完成
          const newContent = [...enhancedDialogue.content];
          newContent[index] = {
            ...newContent[index],
            isTyping: false,
            displayed: text
          };
          
          setCurrentDialogue(prev => ({
            ...prev,
            content: newContent
          }));
        }
      };
      
      // 每条对话的开始时间
      const startDelay = index * 500; // 每条对话之间的延迟
      const timer = setTimeout(typeNextChar, startDelay);
      typingTimersRef.current.push(timer);
    });
  };

  // 处理新增对话内容
  const handleAddItem = () => {
    if (currentItem.speaker && currentItem.text) {
      const newItem = {
        ...currentItem,
        displayed: currentItem.text,
        isTyping: false
      };
      
      const newContent = [...currentDialogue.content, newItem];
      const newDialogue = { ...currentDialogue, content: newContent };
      
      setCurrentDialogue(newDialogue);
      onDialogueChange(newDialogue);
      setCurrentItem({ speaker: '', text: '' });
    }
  };

  // 处理编辑对话内容
  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setCurrentItem(currentDialogue.content[index]);
  };

  // 处理保存编辑
  const handleSaveEdit = () => {
    if (editingIndex !== null && currentItem.speaker && currentItem.text) {
      const newItem = {
        ...currentItem,
        displayed: currentItem.text,
        isTyping: false
      };
      
      const newContent = [...currentDialogue.content];
      newContent[editingIndex] = newItem;
      
      const newDialogue = { ...currentDialogue, content: newContent };
      setCurrentDialogue(newDialogue);
      onDialogueChange(newDialogue);
      
      setEditingIndex(null);
      setCurrentItem({ speaker: '', text: '' });
    }
  };

  // 处理删除对话内容
  const handleDeleteItem = (index: number) => {
    const newContent = currentDialogue.content.filter((_, i) => i !== index);
    const newDialogue = { ...currentDialogue, content: newContent };
    
    setCurrentDialogue(newDialogue);
    onDialogueChange(newDialogue);
    
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentItem({ speaker: '', text: '' });
    }
  };

  // 处理标题更改
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDialogue = { ...currentDialogue, title: e.target.value };
    setCurrentDialogue(newDialogue);
    onDialogueChange(newDialogue);
  };
  
  // 保存对话稿到数据库
  const handleSaveDialogue = async () => {
    try {
      setIsSaving(true);
      
      // 准备要保存的数据
      const dialogueToSave = {
        title: currentDialogue.title,
        speakers: currentDialogue.speakers,
        // 只保存核心数据，不包含显示相关的属性
        content: currentDialogue.content.map(item => ({
          speaker: item.speaker,
          text: item.text
        }))
      };
      
      // 发送到后端API
      const response = await axios.post('/api/dialogues', dialogueToSave);
      
      if (response.data.success) {
        message.success('对话稿保存成功！');
        // 更新当前对话的ID
        const savedDialogue = {
          ...currentDialogue,
          id: response.data.dialogue.id
        };
        setCurrentDialogue(savedDialogue);
        onDialogueChange(savedDialogue);
      } else {
        message.error('保存失败: ' + response.data.message);
      }
    } catch (error) {
      console.error('保存对话稿错误:', error);
      message.error('对话稿保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <Form layout="vertical">
        <Form.Item label="对话标题">
          <Input 
            value={currentDialogue.title} 
            onChange={handleTitleChange}
            placeholder="输入对话标题" 
          />
        </Form.Item>
        
        <Space style={{ marginBottom: 16 }}>
          <Title level={5}>对话内容</Title>
          <Button 
            type="primary" 
            icon={<CloudUploadOutlined />} 
            onClick={handleSaveDialogue}
            loading={isSaving}
          >
            保存稿件
          </Button>
        </Space>
        
        <List
          className="dialogue-list"
          itemLayout="horizontal"
          dataSource={currentDialogue.content}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  type="text" 
                  onClick={() => handleEditItem(index)}
                  disabled={editingIndex !== null || item.isTyping}
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  type="text" 
                  danger 
                  onClick={() => handleDeleteItem(index)}
                  disabled={item.isTyping}
                />
              ]}
            >
              <List.Item.Meta
                title={item.speaker}
                description={
                  <Paragraph>
                    {item.displayed || ''}
                    {item.isTyping && <span className="typing-cursor">|</span>}
                  </Paragraph>
                }
              />
            </List.Item>
          )}
        />
        
        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }}>
          <Form.Item label="发言人">
            <Select
              value={currentItem.speaker}
              onChange={(value) => setCurrentItem({ ...currentItem, speaker: value })}
              placeholder="选择发言人"
              style={{ width: '100%' }}
            >
              {currentDialogue.speakers.map((speaker) => (
                <Option key={speaker} value={speaker}>{speaker}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="对话内容">
            <TextArea
              value={currentItem.text}
              onChange={(e) => setCurrentItem({ ...currentItem, text: e.target.value })}
              placeholder="输入对话内容"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
          
          {editingIndex !== null ? (
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={handleSaveEdit}
              disabled={!currentItem.speaker || !currentItem.text}
            >
              保存修改
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddItem}
              disabled={!currentItem.speaker || !currentItem.text}
            >
              添加对话
            </Button>
          )}
        </Space>
      </Form>
    </div>
  );
};

export default ScriptEditor; 