import React, { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Typography, Space, message, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, AudioOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
      const response = await axios.get('/api/dialogues');
      if (response.data && Array.isArray(response.data)) {
        setDialogues(response.data);
      }
    } catch (error) {
      console.error('获取对话稿失败:', error);
      message.error('无法加载保存的对话稿');
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
      await axios.delete(`/api/dialogues/${id}`);
      message.success('对话稿已删除');
      // 重新加载对话稿列表
      loadDialogues();
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

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>已保存的对话稿</Title>
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
                handleTTSPlayback(selectedDialogue);
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