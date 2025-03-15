import React, { useState } from 'react';
import { Upload, Button, Typography, message, Spin, Card } from 'antd';
import { InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { documentAPI } from '../services/api';
import ScriptEditor from '../components/Document/ScriptEditor';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface DialogueContent {
  speaker: string;
  text: string;
}

interface Dialogue {
  title: string;
  speakers: string[];
  content: DialogueContent[];
}

const DocumentPage: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

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
          <Button 
            type="primary" 
            icon={<FileTextOutlined />} 
            loading={generating}
            onClick={handleGenerateScript}
            disabled={!uploadedFile}
          >
            {generating ? '生成中...' : '生成对话稿'}
          </Button>
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
    </div>
  );
};

export default DocumentPage; 