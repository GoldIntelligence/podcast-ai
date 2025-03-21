import React, { useState, useEffect } from 'react';
import { Upload, Button, Typography, Input, message, Card, List, Progress, Space, Checkbox } from 'antd';
import { UploadOutlined, SoundOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { voiceAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface VoiceItem {
  id: string;
  name: string;
  type: 'system' | 'cloned';
  createdAt?: string;
  usedForBriefing?: boolean;
}

const VoicePage: React.FC = () => {
  const [audioFile, setAudioFile] = useState<any>(null);
  const [transcription, setTranscription] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [voiceList, setVoiceList] = useState<VoiceItem[]>([]);
  const [cloningTasks, setCloningTasks] = useState<{
    taskId: string;
    progress: number;
    status: string;
  }[]>([]);
  const [isForBriefing, setIsForBriefing] = useState(false);

  // 加载音色列表
  useEffect(() => {
    fetchVoiceList();
  }, []);
  
  // 更新克隆任务进度
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (cloningTasks.length > 0) {
        updateTaskProgress();
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [cloningTasks]);

  // 获取音色列表
  const fetchVoiceList = async () => {
    try {
      const response = await voiceAPI.getAllVoices();
      setVoiceList(response.data.voices);
    } catch (error) {
      message.error('获取音色列表失败');
    }
  };

  // 更新任务进度
  const updateTaskProgress = async () => {
    const updatedTasks = [...cloningTasks];
    
    for (let i = 0; i < updatedTasks.length; i++) {
      if (updatedTasks[i].status === 'completed') continue;
      
      try {
        const response = await voiceAPI.getCloneProgress(updatedTasks[i].taskId);
        updatedTasks[i].progress = response.data.progress;
        updatedTasks[i].status = response.data.status;
        
        // 如果任务完成，刷新音色列表
        if (updatedTasks[i].status === 'completed') {
          fetchVoiceList();
        }
      } catch (error) {
        console.error('获取进度失败', error);
      }
    }
    
    setCloningTasks(updatedTasks);
  };

  // 上传音频文件
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const response = await voiceAPI.uploadSample(file, transcription);
      setAudioFile(response.data.file);
      message.success('音频样本上传成功！');
      onSuccess(response, file);
    } catch (error) {
      message.error('音频样本上传失败！');
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  // 开始克隆音色
  const handleStartClone = async () => {
    if (!audioFile || !transcription || !voiceName) {
      message.warning('请填写完整信息！');
      return;
    }
    
    setCloning(true);
    
    try {
      const response = await voiceAPI.cloneVoice(
        audioFile.path,
        transcription,
        voiceName,
        isForBriefing
      );
      
      // 添加到克隆任务列表
      setCloningTasks([
        ...cloningTasks,
        {
          taskId: response.data.taskId,
          progress: 0,
          status: 'processing'
        }
      ]);
      
      message.success('音色克隆任务已提交！');
      
      // 重置表单
      setAudioFile(null);
      setTranscription('');
      setVoiceName('');
      setIsForBriefing(false);
    } catch (error) {
      message.error('提交音色克隆任务失败！');
    } finally {
      setCloning(false);
    }
  };

  // 更新音色使用场景
  const handleUpdateVoiceUsage = async (voiceId: string, usedForBriefing: boolean) => {
    try {
      await voiceAPI.updateVoiceUsage(voiceId, usedForBriefing);
      message.success('音色使用场景更新成功');
      fetchVoiceList();
    } catch (error) {
      message.error('更新音色使用场景失败');
      console.error('更新音色使用场景失败:', error);
    }
  };

  return (
    <div>
      <Title level={4}>音色克隆</Title>
      <Text>上传音频样本，克隆专属音色</Text>
      
      <Card title="上传音频样本" style={{ marginTop: 20 }}>
        <Paragraph>
          请上传5-10秒的MP3音频文件，并提供对应的文字内容。音频质量越好，克隆效果越佳。
        </Paragraph>
        
        <Upload
          customRequest={handleUpload}
          maxCount={1}
          showUploadList={true}
          disabled={uploading || !transcription}
          accept=".mp3"
          onRemove={() => setAudioFile(null)}
        >
          <Button 
            icon={<UploadOutlined />} 
            loading={uploading}
            disabled={!transcription}
          >
            上传音频样本 (MP3)
          </Button>
        </Upload>
        
        <div style={{ marginTop: 20 }}>
          <TextArea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="输入音频对应的文字内容"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>
        
        <div style={{ marginTop: 20 }}>
          <Input
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="给你的音色起个名字"
          />
        </div>
        
        <div style={{ marginTop: 20 }}>
          <Checkbox 
            checked={isForBriefing}
            onChange={(e) => setIsForBriefing(e.target.checked)}
          >
            可用于资讯简报
          </Checkbox>
        </div>
        
        <div style={{ marginTop: 20 }}>
          <Button
            type="primary"
            icon={<SoundOutlined />}
            loading={cloning}
            onClick={handleStartClone}
            disabled={!audioFile || !transcription || !voiceName}
          >
            开始克隆
          </Button>
        </div>
      </Card>
      
      {cloningTasks.length > 0 && (
        <Card title="克隆任务" style={{ marginTop: 20 }}>
          <List
            itemLayout="horizontal"
            dataSource={cloningTasks}
            renderItem={(task) => (
              <List.Item>
                <List.Item.Meta
                  title={`任务ID: ${task.taskId}`}
                  description={
                    <div>
                      <Progress percent={task.progress} status={task.status === 'completed' ? 'success' : 'active'} />
                      <Text>{task.status === 'completed' ? '克隆完成' : '克隆中...'}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
      
      <Card title="我的音色" style={{ marginTop: 20 }}>
        <List
          itemLayout="horizontal"
          dataSource={voiceList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button icon={<PlayCircleOutlined />} type="text">试听</Button>,
                item.type === 'cloned' && (
                  <>
                    <Checkbox 
                      checked={item.usedForBriefing}
                      onChange={(e) => handleUpdateVoiceUsage(item.id, e.target.checked)}
                    >
                      用于简报
                    </Checkbox>
                    <Button icon={<DeleteOutlined />} type="text" danger>删除</Button>
                  </>
                )
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <Space direction="vertical">
                    <Text type="secondary">类型: {item.type === 'system' ? '系统音色' : '克隆音色'}</Text>
                    {item.createdAt && <Text type="secondary">创建时间: {new Date(item.createdAt).toLocaleString()}</Text>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default VoicePage;