import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Select, List, Space, Typography, message, Modal, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloudUploadOutlined, SoundOutlined } from '@ant-design/icons';
import { dialogueAPI, ttsAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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
  const [selectedVoice, setSelectedVoice] = useState('langxianping');
  const [ttsModalVisible, setTtsModalVisible] = useState(false);
  const [generatingTTS, setGeneratingTTS] = useState(false);
  
  const navigate = useNavigate();
  
  // 固定的音色选项
  const voiceOptions = [
    { id: 'langxianping', name: '郎咸平', type: 'system' },
    { id: 'lidaxiao', name: '李大霄', type: 'system' }
  ];
  
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
      displayed: item.displayed || item.text, // 如果已经有displayed属性，保留它
      isTyping: false
    }));
    
    const enhancedDialogue = {
      ...dialogue,
      content: enhancedContent
    };
    
    setCurrentDialogue(enhancedDialogue);
    
    // 如果是新的对话内容（没有id，意味着是刚生成的），才开始打字效果
    if (!dialogue.id) {
      startTypingEffect(enhancedDialogue);
    }
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
        displayed: currentItem.text, // 编辑后立即显示完整文本，不使用打字机效果
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
  
  // 保存到本地存储的函数
  const saveToLocalStorage = (data: Dialogue) => {
    try {
      // 生成唯一ID（如果没有）
      const dialogueToSave = {
        ...data,
        id: data.id || Date.now(),
        updatedAt: new Date().toISOString()
      };
      
      // 获取现有的对话稿列表
      const savedDialoguesStr = localStorage.getItem('saved_dialogues');
      let savedDialogues = savedDialoguesStr ? JSON.parse(savedDialoguesStr) : [];
      
      // 检查是否已存在该ID的对话稿
      const existingIndex = savedDialogues.findIndex((d: any) => d.id === dialogueToSave.id);
      
      if (existingIndex >= 0) {
        // 更新现有对话稿
        savedDialogues[existingIndex] = dialogueToSave;
      } else {
        // 添加新对话稿
        savedDialogues.push(dialogueToSave);
      }
      
      // 保存到localStorage
      localStorage.setItem('saved_dialogues', JSON.stringify(savedDialogues));
      console.log('对话稿已保存到本地存储', dialogueToSave.id);
      
      return dialogueToSave;
    } catch (e) {
      console.error('保存到本地存储失败:', e);
      return data;
    }
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
      
      console.log('准备保存的对话稿数据:', dialogueToSave);
      
      // 无论API成功与否，先保存到本地
      const localSavedDialogue = saveToLocalStorage({
        ...dialogueToSave,
        id: currentDialogue.id
      });
      
      // 将ID更新到当前对话中
      const savedDialogue = {
        ...currentDialogue,
        id: localSavedDialogue.id
      };
      setCurrentDialogue(savedDialogue);
      onDialogueChange(savedDialogue);
      
      message.success('对话稿已保存到本地！');
      
      // 尝试保存到API服务器
      try {
        // 使用API服务保存
        let response;
        if (currentDialogue.id) {
          console.log(`正在更新对话稿 ID: ${currentDialogue.id}`);
          response = await dialogueAPI.updateDialogue(currentDialogue.id, dialogueToSave);
        } else {
          console.log('正在创建新对话稿');
          response = await dialogueAPI.saveDialogue(dialogueToSave);
        }
        
        console.log('服务器响应:', response.data);
        
        if (response.data.success) {
          message.success('对话稿已同步到服务器！');
          console.log('对话稿已成功保存到服务器，ID:', response.data.dialogue.id);
        } else {
          console.error('服务器返回失败:', response.data.message);
        }
      } catch (apiError: any) {
        console.error('API保存失败，但已保存到本地:', apiError);
      }
    } catch (error: any) {
      console.error('保存对话稿错误:', error);
      // 显示更详细的错误信息
      if (error.response) {
        // 服务器返回了错误状态码
        console.error('服务器响应错误:', error.response.data);
        message.error(`保存失败 (${error.response.status}): ${error.response.data.message || '未知错误'}`);
      } else if (error.request) {
        // 请求发送了但没有收到响应
        console.error('没有收到服务器响应:', error.request);
        message.error('服务器没有响应，请检查网络连接');
      } else {
        // 设置请求时发生错误
        console.error('请求错误:', error.message);
        message.error('请求错误: ' + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 处理转为语音
  const handleTTS = () => {
    setTtsModalVisible(true);
  };
  
  // 处理音色选择后的TTS处理
  const handleTTSWithVoice = async () => {
    if (!selectedVoice) {
      message.warning('请选择音色');
      return;
    }
    
    try {
      setGeneratingTTS(true);
      message.loading({ content: '提交TTS合成任务...', key: 'ttsTask', duration: 0 });

      // 调用TTS API开始合成
      const response = await ttsAPI.generateTTS(
        currentDialogue, 
        selectedVoice, // 使用选定的音色
        1, // 默认语速
        'dialog' // 对话模式
      );

      if (response.data && response.data.success) {
        message.success({ content: 'TTS合成任务已提交！正在跳转到TTS页面查看进度...', key: 'ttsTask', duration: 2 });
        // 关闭模态框
        setTtsModalVisible(false);
        // 跳转到TTS页面并直接显示任务进度
        navigate(`/tts?taskId=${response.data.taskId}`);
      } else {
        message.error({ content: '提交TTS任务失败', key: 'ttsTask' });
      }
    } catch (error) {
      console.error('TTS任务提交失败:', error);
      message.error({ content: '提交TTS任务失败，请重试', key: 'ttsTask' });
    } finally {
      setGeneratingTTS(false);
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
          
          <Button
            type="primary"
            icon={<SoundOutlined />}
            onClick={handleTTS}
          >
            转为语音
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
        
        {/* 音色选择模态框 */}
        <Modal
          title="选择音色"
          open={ttsModalVisible}
          onCancel={() => !generatingTTS && setTtsModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setTtsModalVisible(false)} disabled={generatingTTS}>
              取消
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleTTSWithVoice} 
              loading={generatingTTS}
              disabled={generatingTTS}
            >
              生成语音
            </Button>
          ]}
          closable={!generatingTTS}
          maskClosable={!generatingTTS}
        >
          <Form layout="vertical">
            <Form.Item label="选择要使用的音色">
              <Select
                value={selectedVoice}
                onChange={(value) => setSelectedVoice(value)}
                style={{ width: '100%' }}
                disabled={generatingTTS}
              >
                {voiceOptions.map(voice => (
                  <Select.Option key={voice.id} value={voice.id}>
                    {voice.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {generatingTTS && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Spin />
                <p style={{ marginTop: 8 }}>正在提交语音生成任务，请稍候...</p>
              </div>
            )}
          </Form>
        </Modal>
      </Form>
    </div>
  );
};

export default ScriptEditor; 