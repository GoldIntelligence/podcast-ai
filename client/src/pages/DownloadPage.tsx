import React, { useState, useEffect } from 'react';
import { Typography, Card, List, Button, Space, Tag, Input, Empty, message } from 'antd';
import { DownloadOutlined, DeleteOutlined, SearchOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { ttsAPI } from '../services/api';

const { Title, Text } = Typography;
const { Search } = Input;

interface Podcast {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  url: string;
  size: number;
}

const DownloadPage: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // 加载播客列表
  useEffect(() => {
    fetchPodcasts();
  }, []);

  // 获取播客列表
  const fetchPodcasts = async () => {
    setLoading(true);
    try {
      const response = await ttsAPI.getAllPodcasts();
      setPodcasts(response.data.podcasts);
      setFilteredPodcasts(response.data.podcasts);
    } catch (error) {
      message.error('获取播客列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value) {
      setFilteredPodcasts(podcasts);
      return;
    }
    
    const filtered = podcasts.filter(
      podcast => podcast.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredPodcasts(filtered);
  };

  // 处理下载
  const handleDownload = (podcast: Podcast) => {
    const link = document.createElement('a');
    link.href = podcast.url;
    link.download = `${podcast.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理删除
  const handleDelete = async (podcastId: string) => {
    try {
      await ttsAPI.deletePodcast(podcastId);
      message.success('播客已删除');
      // 更新列表
      setPodcasts(podcasts.filter(p => p.id !== podcastId));
      setFilteredPodcasts(filteredPodcasts.filter(p => p.id !== podcastId));
      
      // 如果正在播放，停止播放
      if (playingId === podcastId && currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setPlayingId(null);
      }
    } catch (error) {
      message.error('删除播客失败');
    }
  };

  // 处理播放
  const handlePlay = (podcast: Podcast) => {
    // 如果有正在播放的音频，先停止
    if (currentAudio) {
      currentAudio.pause();
    }
    
    // 如果点击的是当前正在播放的音频，则停止播放
    if (playingId === podcast.id) {
      setCurrentAudio(null);
      setPlayingId(null);
      return;
    }
    
    // 播放新的音频
    const audio = new Audio(podcast.url);
    audio.play();
    setCurrentAudio(audio);
    setPlayingId(podcast.id);
    
    // 播放结束后重置状态
    audio.onended = () => {
      setCurrentAudio(null);
      setPlayingId(null);
    };
  };

  // 格式化时间
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div>
      <Title level={4}>下载中心</Title>
      <Text>管理和下载您生成的播客</Text>
      
      <Card style={{ marginTop: 20 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Search
            placeholder="搜索播客标题"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
          />
          
          {filteredPodcasts.length === 0 ? (
            <Empty description="暂无播客" style={{ margin: '40px 0' }} />
          ) : (
            <List
              className="download-list"
              loading={loading}
              itemLayout="horizontal"
              dataSource={filteredPodcasts}
              renderItem={(podcast) => (
                <List.Item
                  actions={[
                    <Button 
                      icon={playingId === podcast.id ? <PlayCircleOutlined style={{ color: '#1890ff' }} /> : <PlayCircleOutlined />} 
                      type="text"
                      onClick={() => handlePlay(podcast)}
                    >
                      {playingId === podcast.id ? '停止' : '播放'}
                    </Button>,
                    <Button 
                      icon={<DownloadOutlined />} 
                      type="text"
                      onClick={() => handleDownload(podcast)}
                    >
                      下载
                    </Button>,
                    <Button 
                      icon={<DeleteOutlined />} 
                      type="text" 
                      danger
                      onClick={() => handleDelete(podcast.id)}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={podcast.title}
                    description={
                      <Space direction="vertical">
                        <Space>
                          <Tag color="blue">时长: {formatDuration(podcast.duration)}</Tag>
                          <Tag color="green">大小: {formatFileSize(podcast.size)}</Tag>
                        </Space>
                        <Text type="secondary">创建时间: {new Date(podcast.createdAt).toLocaleString()}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default DownloadPage; 