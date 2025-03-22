import axios from 'axios';

// 使用环境变量中的API URL
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
console.log('API服务器URL:', BASE_URL);

// 创建带有详细配置的axios实例
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 超时设置
  timeout: 100000,
  // 禁用凭证，避免CORS问题
  withCredentials: false
});

// 添加请求拦截器，用于添加认证令牌
api.interceptors.request.use(config => {
  // 从localStorage中获取令牌
  const token = localStorage.getItem('token');
  
  // 如果存在令牌，则添加到请求头中
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  console.log(`发送 ${config.method?.toUpperCase()} 请求到: ${config.baseURL}${config.url}`, config.data || '');
  return config;
}, error => {
  console.error('请求发送错误:', error);
  return Promise.reject(error);
});

// 拦截器：打印响应信息
api.interceptors.response.use(response => {
  console.log(`来自 ${response.config.url} 的响应:`, response.data);
  return response;
}, error => {
  if (error.response) {
    // 服务器返回了错误响应
    console.error(`响应错误 (${error.response.status}):`, error.response.data);
  } else if (error.request) {
    // 请求已发送但没有收到响应
    console.error('请求超时或无响应:', error.request);
    
    // 检查是否是认证相关请求
    if (error.config && error.config.url) {
      const url = error.config.url.toLowerCase();
      if (url.includes('/auth/')) {
        console.warn('认证服务不可用，某些功能可能无法正常工作');
      }
    }
  } else {
    // 设置请求时发生了错误
    console.error('请求配置错误:', error.message);
  }
  
  return Promise.reject(error);
});

// 用户认证API
export const authAPI = {
  // 用户注册
  register: (username: string, password: string) => {
    return api.post('/auth/register', { username, password });
  },
  
  // 用户登录
  login: (username: string, password: string) => {
    return api.post('/auth/login', { username, password });
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return api.get('/auth/me');
  },
  
  // 登出（客户端操作，清除localStorage中的令牌）
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
  
  // 检查是否已登录
  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  }
};

// 文档相关API
export const documentAPI = {
  // 上传文档
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 生成对话稿
  generateScript: (filePath: string | any) => {
    console.log('调用生成对话稿API，文件路径:', filePath);
    // 确保filePath是字符串
    const path = typeof filePath === 'object' && filePath 
      ? (filePath.path || filePath.filePath || JSON.stringify(filePath)) 
      : filePath;
    return api.post('/documents/summarize', { filePath: path });
  },

  // 生成资讯简报
  generateBriefing: (filePath: string | any, wordCount: number = 500) => {
    console.log('调用生成简报API，文件路径:', filePath, '字数:', wordCount);
    // 确保filePath是字符串
    const path = typeof filePath === 'object' && filePath 
      ? (filePath.path || filePath.filePath || JSON.stringify(filePath)) 
      : filePath;
    return api.post('/documents/briefing', { filePath: path, wordCount });
  },

  // 获取所有资讯简报
  getAllBriefings: () => {
    return api.get('/documents/briefings');
  },

  // 保存资讯简报
  saveBriefing: (briefing: any) => {
    return api.post('/documents/briefings', briefing);
  },

  // 更新资讯简报
  updateBriefing: (id: number, briefing: any) => {
    return api.put(`/documents/briefings/${id}`, briefing);
  },

  // 删除资讯简报
  deleteBriefing: (id: number) => {
    return api.delete(`/documents/briefings/${id}`);
  },

  // 生成语音
  generateTts: (script: string, voiceId: string) => {
    return api.post('/tts/generate', {
      script,
      voice_id: voiceId
    });
  },
  
  // 获取语音生成进度
  getTtsProgress: () => {
    return api.get('/tts/progress');
  }
};

// 音色相关API
export const voiceAPI = {
  // 上传音频样本
  uploadSample: (file: File, transcription: string) => {
    const formData = new FormData();
    formData.append('audioSample', file);
    formData.append('transcription', transcription);
    return api.post('/voices/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 克隆音色
  cloneVoice: (audioPath: string, transcription: string, voiceName: string, usedForBriefing: boolean = false) => {
    return api.post('/voices/clone', { audioPath, transcription, voiceName, usedForBriefing });
  },
  
  // 获取克隆进度
  getCloneProgress: (taskId: string) => {
    return api.get(`/voices/progress/${taskId}`);
  },
  
  // 获取所有音色
  getAllVoices: () => {
    return api.get('/voices/all');
  },
  
  // 更新音色使用场景
  updateVoiceUsage: (voiceId: string, usedForBriefing: boolean) => {
    return api.put(`/voices/${voiceId}/usage`, { usedForBriefing });
  },
};

// TTS相关API
export const ttsAPI = {
  // 生成TTS
  generateTTS: async (
    dialogue: { id?: number; title: string; speakers: string[]; content: { speaker: string; text: string }[] }, 
    voiceId: string, 
    speed: number, 
    emotionMode: string = 'normal'
  ) => {
    console.log('提交TTS生成请求:', { dialogue, voiceId, speed, emotionMode });
    return api.post('/tts/generate', {
      script: dialogue,
      voiceId,
      speed,
      emotionMode
    });
  },
  
  // 获取TTS生成进度
  getTTSProgress: async (taskId: string) => {
    console.log('获取TTS进度:', taskId);
    const response = await api.get(`/tts/progress/${taskId}`);
    console.log('TTS进度响应:', response.data);
    return response;
  },
  
  // 获取所有播客
  getAllPodcasts: () => {
    return api.get('/tts/podcasts');
  },
  
  // 删除播客
  deletePodcast: (podcastId: string) => {
    return api.delete(`/tts/podcasts/${podcastId}`);
  },
  
  // 新增方法：直接下载TTS音频
  downloadTTSAudio: async (audioUrl: string, filename: string): Promise<boolean> => {
    console.log('开始下载TTS音频:', audioUrl);
    
    // 处理相对URL，确保它是完整的URL
    if (audioUrl.startsWith('/api/')) {
      // 本地开发环境中，需要补充域名和端口
      audioUrl = `http://localhost:5001${audioUrl.substring(4)}`;
      console.log('转换后的完整URL:', audioUrl);
    }
    
    // 如果URL包含taskId，直接使用专门的下载接口
    const taskIdMatch = audioUrl.match(/\/audio\/([^/]+)\/mixed_audio\.mp3$/);
    if (taskIdMatch && taskIdMatch[1]) {
      const taskId = taskIdMatch[1];
      console.log('检测到任务ID:', taskId);
      try {
        // 使用专门的下载端点 - 使用相对路径，适配不同环境
        const response = await axios({
          url: `${BASE_URL}/tts/download/${taskId}`,
          method: 'GET',
          responseType: 'blob'
        });
        
        console.log('下载响应:', response.status);
        
        // 创建Blob URL并触发下载
        const blobUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: 'audio/mpeg' })
        );
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理Blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
        return true;
      } catch (error) {
        console.error('专用下载接口失败, 回退到常规方式:', error);
      }
    }
    
    // 常规下载方式
    try {
      console.log('使用常规方式下载URL:', audioUrl);
      const response = await axios({
        url: audioUrl,
        method: 'GET',
        responseType: 'blob'
      });
      
      console.log('常规下载响应:', response.status);
      
      // 创建Blob URL并触发下载
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: 'audio/mpeg' })
      );
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理Blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('下载失败:', error);
      return false;
    }
  }
};

// 对话稿相关API
export const dialogueAPI = {
  // 获取所有对话稿
  getAllDialogues: () => {
    return api.get('/dialogues');
  },
  
  // 获取单个对话稿
  getDialogue: (id: number) => {
    return api.get(`/dialogues/${id}`);
  },
  
  // 保存对话稿
  saveDialogue: (dialogue: any) => {
    return api.post('/dialogues', dialogue);
  },
  
  // 更新对话稿
  updateDialogue: (id: number, dialogue: any) => {
    return api.put(`/dialogues/${id}`, dialogue);
  },
  
  // 删除对话稿
  deleteDialogue: (id: number) => {
    return api.delete(`/dialogues/${id}`);
  },
};

export default {
  authAPI,
  documentAPI,
  voiceAPI,
  ttsAPI,
  dialogueAPI,
}; 