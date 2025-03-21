import React, { useState, useEffect } from 'react';
import { Typography, Card, Select, Slider, Button, message, Progress, Space, Spin } from 'antd';
import { CustomerServiceOutlined, PlayCircleOutlined, PauseCircleOutlined, FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { voiceAPI, ttsAPI } from '../services/api';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface VoiceItem {
  id: string;
  name: string;
  type: 'system' | 'cloned';
}

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
}

interface Briefing {
  id?: number;
  title: string;
  summary: string;
  key_points: string[];
  market_impact?: string;
  expert_opinion?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TTSTask {
  taskId: string;
  progress: number;
  status: string;
  audioUrl?: string;
}

const TTSPage: React.FC = () => {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speed, setSpeed] = useState(1);
  const [emotionMode, setEmotionMode] = useState('dialog');
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [contentType, setContentType] = useState<'dialogue' | 'briefing'>('dialogue');
  const [generating, setGenerating] = useState(false);
  const [ttsTasks, setTtsTasks] = useState<TTSTask[]>([]);
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingSavedDialogue, setLoadingSavedDialogue] = useState(false);
  const [savedDialogues, setSavedDialogues] = useState<Dialogue[]>([]);
  const [loadingSavedList, setLoadingSavedList] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  // 加载音色和对话稿
  useEffect(() => {
    fetchVoices();
    fetchSavedDialogues();
    
    // 检查URL中是否包含参数
    const params = new URLSearchParams(location.search);
    const dialogueId = params.get('dialogueId');
    const taskId = params.get('taskId');
    const voiceId = params.get('voiceId'); // 获取音色ID
    const type = params.get('type'); // 获取内容类型
    
    if (type === 'briefing') {
      setContentType('briefing');
      setEmotionMode('briefing');
    } else {
      setContentType('dialogue');
      setEmotionMode('dialog');
    }
    
    if (voiceId) {
      // 设置选中音色
      setSelectedVoice(voiceId);
    }
    
    if (dialogueId) {
      // 加载指定ID的对话稿
      loadSavedDialogue(parseInt(dialogueId));
    } else if (taskId) {
      // 如果有任务ID，直接显示任务进度
      setTtsTasks([{
        taskId,
        progress: 0,
        status: 'processing'
      }]);
      
      // 立即获取一次进度
      (async () => {
        try {
          const response = await ttsAPI.getTTSProgress(taskId);
          if (response.data && response.data.success) {
            setTtsTasks([{
              taskId,
              progress: response.data.progress,
              status: response.data.status,
              audioUrl: response.data.audioUrl
            }]);
            
            if (response.data.status === 'completed' && response.data.audioUrl) {
              const audio = new Audio(response.data.audioUrl);
              
              // 添加事件监听器
              audio.addEventListener('loadeddata', () => {
                console.log('音频加载成功', response.data.audioUrl);
              });
              
              audio.addEventListener('error', (e) => {
                console.error('音频加载错误', e);
                message.error('音频加载失败，请刷新页面重试');
              });
              
              setAudioPreview(audio);
            }
          }
        } catch (error) {
          console.error('获取任务进度失败', error);
        }
      })();
    } else {
      // 从本地存储或全局状态加载内容
      if (type === 'briefing') {
        const savedBriefing = localStorage.getItem('current_briefing_for_tts');
        if (savedBriefing) {
          try {
            setBriefing(JSON.parse(savedBriefing));
          } catch (error) {
            console.error('解析简报失败', error);
          }
        }
      } else {
        const savedDialogue = localStorage.getItem('currentDialogue');
        if (savedDialogue) {
          try {
            setDialogue(JSON.parse(savedDialogue));
          } catch (error) {
            console.error('解析对话稿失败', error);
          }
        }
      }
    }
  }, [location.search]);

  // 在音频元素上添加事件监听
  useEffect(() => {
    if (audioPreview) {
      const handleEnded = () => {
        setIsPlaying(false);
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
      };
      
      const handleError = (e: Event) => {
        console.error('音频播放错误', e);
        message.error('音频播放失败，请刷新页面重试');
        setIsPlaying(false);
      };
      
      audioPreview.addEventListener('ended', handleEnded);
      audioPreview.addEventListener('play', handlePlay);
      audioPreview.addEventListener('pause', handlePause);
      audioPreview.addEventListener('error', handleError);
      
      return () => {
        audioPreview.removeEventListener('ended', handleEnded);
        audioPreview.removeEventListener('play', handlePlay);
        audioPreview.removeEventListener('pause', handlePause);
        audioPreview.removeEventListener('error', handleError);
      };
    }
  }, [audioPreview]);

  // 更新TTS任务进度
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (ttsTasks.length > 0) {
        updateTaskProgress();
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [ttsTasks]);

  // 获取音色列表
  const fetchVoices = async () => {
    try {
      const response = await voiceAPI.getAllVoices();
      setVoices(response.data.voices);
      
      // 如果有音色，默认选择第一个
      if (response.data.voices.length > 0) {
        setSelectedVoice(response.data.voices[0].id);
      }
    } catch (error) {
      message.error('获取音色列表失败');
    }
  };
  
  // 获取所有保存的对话稿
  const fetchSavedDialogues = async () => {
    try {
      setLoadingSavedList(true);
      const response = await axios.get('/api/dialogues');
      if (response.data && Array.isArray(response.data)) {
        setSavedDialogues(response.data);
      }
    } catch (error) {
      console.error('获取对话稿列表失败:', error);
    } finally {
      setLoadingSavedList(false);
    }
  };
  
  // 加载指定ID的对话稿
  const loadSavedDialogue = async (dialogueId: number) => {
    try {
      setLoadingSavedDialogue(true);
      const response = await axios.get(`/api/dialogues/${dialogueId}`);
      if (response.data) {
        setDialogue(response.data);
        setContentType('dialogue');
        // 更新URL，移除dialogueId参数
        navigate('/tts', { replace: true });
      }
    } catch (error) {
      console.error('加载对话稿失败:', error);
      message.error('无法加载指定的对话稿');
    } finally {
      setLoadingSavedDialogue(false);
    }
  };
  
  // 选择已保存的对话稿
  const handleSelectSavedDialogue = (dialogueId: number) => {
    loadSavedDialogue(dialogueId);
  };

  // 更新任务进度
  const updateTaskProgress = async () => {
    const updatedTasks = [...ttsTasks];
    
    for (let i = 0; i < updatedTasks.length; i++) {
      if (updatedTasks[i].status === 'completed') continue;
      
      try {
        const response = await ttsAPI.getTTSProgress(updatedTasks[i].taskId);
        updatedTasks[i].progress = response.data.progress;
        updatedTasks[i].status = response.data.status;
        updatedTasks[i].audioUrl = response.data.audioUrl;
        
        // 播放预览
        if (updatedTasks[i].status === 'completed' && response.data.audioUrl) {
          console.log('设置音频URL:', response.data.audioUrl);
          const audio = new Audio(response.data.audioUrl);
          
          // 添加事件监听器
          audio.addEventListener('loadeddata', () => {
            console.log('音频加载成功');
          });
          
          audio.addEventListener('error', (e) => {
            console.error('音频加载错误', e);
            message.error('音频加载失败，请刷新页面重试');
          });
          
          setAudioPreview(audio);
        }
      } catch (error) {
        console.error('获取进度失败', error);
      }
    }
    
    setTtsTasks(updatedTasks);
  };

  // 处理生成TTS
  const handleGenerateTTS = async () => {
    if (!selectedVoice) {
      message.warning('请选择音色');
      return;
    }
    
    if (contentType === 'briefing' && !briefing) {
      message.warning('请准备简报内容');
      return;
    }
    
    if (contentType === 'dialogue' && !dialogue) {
      message.warning('请准备对话稿');
      return;
    }
    
    setGenerating(true);
    
    try {
      let response;
      if (contentType === 'briefing' && briefing) {
        // 构建语音文本
        const script = `
今日简讯：${briefing.title}

${briefing.summary}

关键要点：
${briefing.key_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}
${briefing.market_impact ? `市场影响：\n${briefing.market_impact}\n` : ''}
${briefing.expert_opinion ? `专家观点：\n${briefing.expert_opinion}` : ''}
        `.trim();

        response = await ttsAPI.generateTTS(
          {
            title: briefing.title,
            speakers: ['主播'],
            content: [
              { speaker: '主播', text: script }
            ]
          },
          selectedVoice,
          speed,
          'briefing'
        );
      } else if (contentType === 'dialogue' && dialogue) {
        response = await ttsAPI.generateTTS(
          dialogue,
          selectedVoice,
          speed,
          emotionMode
        );
      } else {
        throw new Error('没有可用的内容');
      }
      
      // 添加到任务列表
      setTtsTasks([
        ...ttsTasks,
        {
          taskId: response.data.taskId,
          progress: 0,
          status: 'processing'
        }
      ]);
      
      message.success('TTS合成任务已提交！');
    } catch (error) {
      message.error('提交TTS合成任务失败！');
    } finally {
      setGenerating(false);
    }
  };

  // 播放/暂停预览
  const togglePlay = () => {
    if (!audioPreview) {
      message.error('没有可用的音频');
      return;
    }
    
    try {
      if (isPlaying) {
        audioPreview.pause();
      } else {
        // 确保音频URL是可用的
        if (!audioPreview.src) {
          message.error('音频源不可用');
          return;
        }
        
        const playPromise = audioPreview.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('播放失败:', error);
            message.error('播放失败，请刷新页面重试');
          });
        }
      }
    } catch (error) {
      console.error('播放控制错误:', error);
      message.error('播放控制失败');
    }
  };

  // 下载音频文件
  const downloadAudio = (url: string, filename: string) => {
    console.log('开始下载音频 (旧方法)', url);
    // 创建一个XHR请求来获取音频文件的blob
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    
    xhr.onload = function() {
      if (this.status === 200) {
        // 创建一个blob URL
        const blob = new Blob([this.response], { type: 'audio/mpeg' });
        const blobUrl = window.URL.createObjectURL(blob);
        
        // 创建一个下载链接并点击
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
        message.success('音频下载成功');
      } else {
        message.error('下载失败：' + this.status);
        console.error('下载失败', this.status, this.statusText);
      }
    };
    
    xhr.onerror = function() {
      message.error('下载失败，可能是网络问题');
      console.error('下载失败', this);
    };
    
    xhr.send();
  };

  return (
    <div>
      <Title level={4}>播客合成</Title>
      <Text>选择音色，合成高质量播客</Text>
      
      {/* 显示TTS任务进度 */}
      {ttsTasks.length > 0 && (
        <Card title="合成进度" style={{ marginTop: 20 }}>
          {ttsTasks.map((task) => (
            <div key={task.taskId} style={{ marginBottom: 16 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text>任务ID: {task.taskId}</Text>
                <Text>状态: {task.status === 'completed' ? '已完成' : task.status === 'processing' ? '处理中' : task.status === 'merging' ? '合并中' : task.status}</Text>
              </Space>
              <Progress 
                percent={task.progress} 
                status={task.status === 'error' ? 'exception' : task.status === 'completed' ? 'success' : 'active'} 
              />
              
              {task.status === 'completed' && audioPreview && (
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
                      onClick={togglePlay}
                    >
                      {isPlaying ? '暂停' : '播放'}
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        if (task.audioUrl) {
                          console.log('尝试下载音频:', task.audioUrl);
                          
                          // 构建更有意义的文件名: 标题+日期时间.mp3
                          const now = new Date();
                          const dateStr = now.getFullYear() + 
                            ('0' + (now.getMonth() + 1)).slice(-2) + 
                            ('0' + now.getDate()).slice(-2) + 
                            ('0' + now.getHours()).slice(-2) + 
                            ('0' + now.getMinutes()).slice(-2) + 
                            ('0' + now.getSeconds()).slice(-2);
                          
                          // 使用对话稿标题(如果有)
                          let title = dialogue?.title || '播客';
                          // 删除标题中的特殊字符
                          title = title.replace(/[\\/:*?"<>|]/g, '_');
                          
                          const filename = `${title}_${dateStr}.mp3`;
                          
                          message.loading('音频文件下载中...', 1);
                          ttsAPI.downloadTTSAudio(task.audioUrl, filename)
                            .then(success => {
                              if (success) {
                                message.success('音频下载成功');
                              } else {
                                message.error('音频下载失败');
                              }
                            })
                            .catch(err => {
                              console.error('下载出错:', err);
                              message.error('下载过程中出错');
                            });
                        } else {
                          message.error('音频URL不存在');
                        }
                      }}
                    >
                      下载音频
                    </Button>
                  </Space>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
      
      {loadingSavedDialogue ? (
        <Card style={{ marginTop: 20, textAlign: 'center' }}>
          <Spin tip="正在加载对话稿..." />
        </Card>
      ) : !dialogue ? (
        <Card style={{ marginTop: 20, textAlign: 'center' }}>
          <Paragraph>
            您还没有准备对话稿，请先在文档处理页面生成对话稿或选择一个已保存的对话稿。
          </Paragraph>
          <Space>
            <Button type="primary" href="/">
              前往文档处理
            </Button>
            <Button href="/saved-scripts">
              查看已保存对话稿
            </Button>
          </Space>
        </Card>
      ) : (
        <>
          <Card title="合成设置" style={{ marginTop: 20 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 选择已保存的对话稿 */}
              <div>
                <Text strong>选择已保存的对话稿</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="选择已保存的对话稿"
                  onChange={(value) => handleSelectSavedDialogue(Number(value))}
                  loading={loadingSavedList}
                  optionLabelProp="label"
                >
                  {savedDialogues.map((item) => (
                    <Option key={item.id} value={item.id} label={item.title}>
                      <Space>
                        <FileTextOutlined />
                        <span>{item.title}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong>选择音色</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={selectedVoice}
                  onChange={(value) => setSelectedVoice(value)}
                  placeholder="选择音色"
                >
                  {voices.map((voice) => (
                    <Option key={voice.id} value={voice.id}>
                      {voice.name} ({voice.type === 'system' ? '系统音色' : '克隆音色'})
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div style={{ marginTop: 16 }}>
                <Text strong>语速调节</Text>
                <Slider
                  min={0.8}
                  max={1.5}
                  step={0.1}
                  value={speed}
                  onChange={(value) => setSpeed(value)}
                  marks={{
                    0.8: '慢',
                    1: '正常',
                    1.5: '快'
                  }}
                />
              </div>
              
              <div style={{ marginTop: 16 }}>
                <Text strong>情感模式</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={emotionMode}
                  onChange={(value) => setEmotionMode(value)}
                >
                  <Option value="news">新闻播报</Option>
                  <Option value="story">故事讲述</Option>
                  <Option value="dialog">对话交流</Option>
                </Select>
              </div>
              
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<CustomerServiceOutlined />}
                  loading={generating}
                  onClick={handleGenerateTTS}
                >
                  开始合成
                </Button>
              </div>
            </Space>
          </Card>
          
          {dialogue && (
            <Card title="对话稿预览" style={{ marginTop: 20 }}>
              <Title level={5}>{dialogue.title}</Title>
              {dialogue.content.map((item, index) => (
                <Paragraph key={index}>
                  <Text strong>{item.speaker}:</Text> {item.text}
                </Paragraph>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TTSPage;