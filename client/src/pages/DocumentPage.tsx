import React, { useState, useEffect } from 'react';
import { Upload, Button, Typography, message, Spin, Card, Select, Space, Modal, List } from 'antd';
import { InboxOutlined, FileTextOutlined, SaveOutlined, LoadingOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { documentAPI } from '../services/api';
import ScriptEditor from '../components/Document/ScriptEditor';
import { dialogueAPI } from '../services/api';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface DialogueContent {
  speaker: string;
  text: string;
}

interface Dialogue {
  id?: number;
  title: string;
  speakers: string[];
  content: DialogueContent[];
  createdAt?: string;
  updatedAt?: string;
}

const DocumentPage: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [savedDialogues, setSavedDialogues] = useState<Dialogue[]>([]);
  const [loadModalVisible, setLoadModalVisible] = useState(false);

  // 从localStorage加载保存的对话稿
  useEffect(() => {
    try {
      const savedDialoguesStr = localStorage.getItem('saved_dialogues');
      if (savedDialoguesStr) {
        const dialogues = JSON.parse(savedDialoguesStr);
        setSavedDialogues(dialogues);
        console.log('从本地存储加载了', dialogues.length, '个对话稿');
        
        // 尝试将本地存储的对话稿同步到服务器
        syncLocalDialoguesToServer(dialogues);
      }
    } catch (e) {
      console.error('从localStorage加载对话稿失败:', e);
    }
  }, []);
  
  // 将本地对话稿同步到服务器
  const syncLocalDialoguesToServer = async (localDialogues: Dialogue[]) => {
    if (!localDialogues || localDialogues.length === 0) return;
    
    try {
      console.log('正在同步本地对话稿到服务器...');
      // 获取服务器上的对话稿
      const response = await dialogueAPI.getAllDialogues();
      let serverDialogues: any[] = [];
      
      if (response.data && response.data.success && Array.isArray(response.data.dialogues)) {
        serverDialogues = response.data.dialogues;
      } else if (response.data && Array.isArray(response.data)) {
        serverDialogues = response.data;
      }
      
      // 找出服务器上不存在的本地对话稿
      const serverIds = new Set(serverDialogues.map((d: any) => d.id));
      const dialoguesToSync = localDialogues.filter(d => !serverIds.has(d.id));
      
      if (dialoguesToSync.length === 0) {
        console.log('所有本地对话稿已同步到服务器');
        return;
      }
      
      console.log(`准备同步 ${dialoguesToSync.length} 个本地对话稿到服务器`);
      
      // 将本地对话稿保存到服务器
      for (const dialogue of dialoguesToSync) {
        const syncData = {
          title: dialogue.title,
          speakers: dialogue.speakers,
          content: dialogue.content.map(item => ({
            speaker: item.speaker,
            text: item.text
          }))
        };
        
        try {
          await dialogueAPI.saveDialogue(syncData);
          console.log(`对话稿 "${dialogue.title}" 已同步到服务器`);
        } catch (error) {
          console.error(`同步对话稿 "${dialogue.title}" 失败:`, error);
        }
      }
      
      console.log('本地对话稿同步完成');
    } catch (error) {
      console.error('同步本地对话稿到服务器失败:', error);
    }
  };

  // 处理文件上传
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const response = await documentAPI.uploadDocument(file);
      setUploadedFile(response.data.file);
      message.success('文件上传成功！');
      onSuccess(response, file);
    } catch (error) {
      message.error('文件上传失败！');
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  // 处理文件列表变化
  const handleChange = (info: any) => {
    let newFileList = [...info.fileList];
    
    // 只保留最后上传的文件
    newFileList = newFileList.slice(-1);
    
    setFileList(newFileList);
  };

  // 生成对话稿
  const handleGenerateScript = async () => {
    if (!uploadedFile) {
      message.warning('请先上传文件！');
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await documentAPI.generateScript(uploadedFile.path);
      setDialogue(response.data.dialogue);
      message.success('对话稿生成成功！');
    } catch (error) {
      message.error('对话稿生成失败！');
    } finally {
      setGenerating(false);
    }
  };

  // 处理对话稿编辑
  const handleScriptEdit = (newDialogue: Dialogue) => {
    setDialogue(newDialogue);
    
    // 更新本地存储的对话稿列表
    if (newDialogue.id) {
      try {
        const savedDialoguesStr = localStorage.getItem('saved_dialogues');
        let dialogues = savedDialoguesStr ? JSON.parse(savedDialoguesStr) : [];
        
        // 检查是否需要更新savedDialogues状态
        const existingIndex = savedDialogues.findIndex(d => d.id === newDialogue.id);
        if (existingIndex >= 0) {
          const updatedDialogues = [...savedDialogues];
          updatedDialogues[existingIndex] = newDialogue;
          setSavedDialogues(updatedDialogues);
        }
      } catch (e) {
        console.error('更新本地对话稿状态失败:', e);
      }
    }
  };
  
  // 显示加载对话稿模态框
  const showLoadDialogueModal = () => {
    // 重新从localStorage加载以确保最新
    try {
      const savedDialoguesStr = localStorage.getItem('saved_dialogues');
      if (savedDialoguesStr) {
        const dialogues = JSON.parse(savedDialoguesStr);
        setSavedDialogues(dialogues);
      }
    } catch (e) {
      console.error('从localStorage刷新对话稿失败:', e);
    }
    
    setLoadModalVisible(true);
  };
  
  // 加载选中的对话稿
  const handleLoadDialogue = (selectedDialogue: Dialogue) => {
    setDialogue(selectedDialogue);
    setLoadModalVisible(false);
    message.success(`已加载对话稿: ${selectedDialogue.title}`);
    
    // 如果从本地加载了对话稿，尝试同步到服务器
    if (selectedDialogue && selectedDialogue.id && !selectedDialogue.id.toString().startsWith('server_')) {
      const syncData = {
        title: selectedDialogue.title,
        speakers: selectedDialogue.speakers,
        content: selectedDialogue.content.map(item => ({
          speaker: item.speaker,
          text: item.text
        }))
      };
      
      dialogueAPI.saveDialogue(syncData)
        .then(response => {
          console.log('已加载的对话稿同步到服务器成功:', response.data);
        })
        .catch(error => {
          console.error('同步已加载对话稿到服务器失败:', error);
        });
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '未知时间';
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div>
      <Title level={4}>文档处理</Title>
      <Text>上传咨询文档，生成对话稿</Text>
      
      <Card style={{ marginTop: 20 }}>
        <Dragger
          name="document"
          fileList={fileList}
          customRequest={handleUpload}
          onChange={handleChange}
          maxCount={1}
          accept=".pdf,.docx,.txt"
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 PDF、DOCX、TXT 格式，文件大小不超过 50MB
          </p>
        </Dragger>
        
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<FileTextOutlined />} 
              loading={generating}
              onClick={handleGenerateScript}
              disabled={!uploadedFile}
            >
              {generating ? '生成中...' : '生成对话稿'}
            </Button>
            
            <Button
              icon={<FolderOpenOutlined />}
              onClick={showLoadDialogueModal}
              disabled={savedDialogues.length === 0}
            >
              加载已保存稿件
            </Button>
          </Space>
        </div>
      </Card>
      
      {generating && (
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <Spin tip="正在分析文档并生成对话稿..." />
        </div>
      )}
      
      {dialogue && !generating && (
        <Card title="对话稿编辑器" style={{ marginTop: 20 }}>
          <ScriptEditor dialogue={dialogue} onDialogueChange={handleScriptEdit} />
        </Card>
      )}
      
      {/* 加载对话稿模态框 */}
      <Modal
        title="加载已保存的对话稿"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={savedDialogues}
          renderItem={(item: Dialogue) => (
            <List.Item
              actions={[
                <Button 
                  type="primary"
                  size="small"
                  onClick={() => handleLoadDialogue(item)}
                >
                  加载
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={
                  <div>
                    <p>更新时间: {formatDateTime(item.updatedAt)}</p>
                    <p>段落数: {item.content.length}</p>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default DocumentPage; 