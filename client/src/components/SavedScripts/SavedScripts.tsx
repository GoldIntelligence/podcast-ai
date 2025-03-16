import React, { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Typography, Space, message, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, AudioOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dialogueAPI, ttsAPI } from '../../services/api';

const { Title, Text } = Typography;

interface DialogueContent {
  speaker: string;
  text: string;
}

interface Dialogue {
  id: number;
  title: string;
  speakers: string[];
  content: DialogueContent[];
  createdAt: string;
}

const SavedScripts: React.FC = () => {
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDialogue, setSelectedDialogue] = useState<Dialogue | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  // 加载所有保存的对话稿
  const loadDialogues = async () => {
    try {
      setLoading(true);
      // 使用封装的API服务
      const response = await dialogueAPI.getAllDialogues();
      console.log('获取到的对话稿数据:', response.data);
      
      // 处理API返回的数据结构
      if (response.data && response.data.success && Array.isArray(response.data.dialogues)) {
        setDialogues(response.data.dialogues);
      } else if (response.data && Array.isArray(response.data)) {
        // 兼容可能的不同数据格式
        setDialogues(response.data);
      } else {
        console.warn('对话稿数据格式不符合预期:', response.data);
        setDialogues([]);
      }
      
      // 如果数据库没有数据，尝试从localStorage获取
      if ((response.data.dialogues && response.data.dialogues.length === 0) || 
          (Array.isArray(response.data) && response.data.length === 0)) {
        try {
          const savedDialoguesStr = localStorage.getItem('saved_dialogues');
          if (savedDialoguesStr) {
            const localDialogues = JSON.parse(savedDialoguesStr);
            if (Array.isArray(localDialogues) && localDialogues.length > 0) {
              setDialogues(localDialogues);
              message.info('从本地存储加载了保存的对话稿');
            }
          }
        } catch (e) {
          console.error('从localStorage加载失败:', e);
        }
      }
    } catch (error) {
      console.error('获取对话稿失败:', error);
      message.error('无法从服务器加载保存的对话稿');
      
      // 尝试从localStorage获取
      try {
        const savedDialoguesStr = localStorage.getItem('saved_dialogues');
        if (savedDialoguesStr) {
          const localDialogues = JSON.parse(savedDialoguesStr);
          if (Array.isArray(localDialogues) && localDialogues.length > 0) {
            setDialogues(localDialogues);
            message.info('从本地存储加载了保存的对话稿');
          }
        }
      } catch (e) {
        console.error('从localStorage加载失败:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDialogues();
  }, []);

  // 查看对话稿详情
  const handleViewDialogue = (dialogue: Dialogue) => {
    setSelectedDialogue(dialogue);
    setModalVisible(true);
  };

  // 编辑对话稿
  const handleEditDialogue = (dialogue: Dialogue) => {
    navigate(`/document/edit/${dialogue.id}`);
  };

  // 删除对话稿
  const handleDeleteDialogue = async (id: number) => {
    try {
      await dialogueAPI.deleteDialogue(id);
      message.success('对话稿已删除');
      // 重新加载对话稿列表
      loadDialogues();
      
      // 同时从localStorage删除
      try {
        const savedDialoguesStr = localStorage.getItem('saved_dialogues');
        if (savedDialoguesStr) {
          let localDialogues = JSON.parse(savedDialoguesStr);
          localDialogues = localDialogues.filter((d: any) => d.id !== id);
          localStorage.setItem('saved_dialogues', JSON.stringify(localDialogues));
        }
      } catch (e) {
        console.error('从localStorage删除失败:', e);
      }
    } catch (error) {
      console.error('删除对话稿失败:', error);
      message.error('删除对话稿时出错');
    }
  };

  // 使用TTS播放对话稿
  const handleTTSPlayback = (dialogue: Dialogue) => {
    // 跳转到TTS页面并传递对话稿ID
    navigate(`/tts?dialogueId=${dialogue.id}`);
  };

  // 直接开始TTS合成
  const handleDirectTTS = async (dialogue: Dialogue) => {
    try {
      message.loading({ content: '提交TTS合成任务...', key: 'ttsTask', duration: 0 });

      // 调用TTS API开始合成
      const response = await ttsAPI.generateTTS(
        dialogue, 
        'auto', // 使用自动选择音色
        1, // 默认语速
        'dialog' // 对话模式
      );

      if (response.data && response.data.success) {
        message.success({ content: 'TTS合成任务已提交！正在跳转到TTS页面查看进度...', key: 'ttsTask', duration: 2 });
        // 跳转到TTS页面并直接显示任务进度
        navigate(`/tts?taskId=${response.data.taskId}`);
      } else {
        message.error({ content: '提交TTS任务失败', key: 'ttsTask' });
      }
    } catch (error) {
      console.error('TTS任务提交失败:', error);
      message.error({ content: '提交TTS任务失败，请重试', key: 'ttsTask' });
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return '未知时间';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={2}>已保存的对话稿</Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadDialogues} 
          loading={loading}
        >
          刷新
        </Button>
      </div>
      <Text type="secondary" style={{ marginBottom: '20px', display: 'block' }}>
        查看、编辑或删除您保存的对话稿，也可以将对话稿发送到TTS进行语音合成
      </Text>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '20px' }}>正在加载对话稿...</div>
        </div>
      ) : (
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 3,
            lg: 3,
            xl: 4,
            xxl: 4,
          }}
          dataSource={dialogues}
          locale={{ emptyText: '没有找到保存的对话稿' }}
          renderItem={(dialogue) => (
            <List.Item>
              <Card
                title={dialogue.title}
                hoverable
                actions={[
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => handleViewDialogue(dialogue)}
                  />,
                  <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    onClick={() => handleEditDialogue(dialogue)}
                  />,
                  <Button 
                    type="text" 
                    icon={<AudioOutlined />} 
                    onClick={() => handleTTSPlayback(dialogue)}
                  />,
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeleteDialogue(dialogue.id)}
                  />
                ]}
              >
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary">创建时间: {formatDate(dialogue.createdAt)}</Text>
                </div>
                <div>
                  <Text>发言人: {dialogue.speakers.join(', ')}</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">对话片段: {dialogue.content.length} 条</Text>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* 对话稿详情模态框 */}
      <Modal
        title={selectedDialogue?.title}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="tts" 
            type="primary" 
            icon={<AudioOutlined />}
            onClick={() => {
              setModalVisible(false);
              if (selectedDialogue) {
                // 使用直接合成方法
                handleDirectTTS(selectedDialogue);
              }
            }}
          >
            转为语音
          </Button>
        ]}
        width={700}
      >
        {selectedDialogue && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">创建时间: {formatDate(selectedDialogue.createdAt)}</Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>发言人: </Text>
              <Text>{selectedDialogue.speakers.join(', ')}</Text>
            </div>
            <List
              itemLayout="vertical"
              dataSource={selectedDialogue.content}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>{item.speaker}:</Text>
                    <Text>{item.text}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SavedScripts; 