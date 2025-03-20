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
  timeout: 10000,
  // 禁用凭证，避免CORS问题
  withCredentials: false
});

// 拦截器：打印请求信息
api.interceptors.request.use(config => {
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
  console.error('响应错误:', error);
  return Promise.reject(error);
});

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
  generateScript: (filePath: string) => {
    return api.post('/documents/summarize', { filePath });
  },
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
  cloneVoice: (audioPath: string, transcription: string, voiceName: string) => {
    return api.post('/voices/clone', { audioPath, transcription, voiceName });
  },
  
  // 获取克隆进度
  getCloneProgress: (taskId: string) => {
    return api.get(`/voices/progress/${taskId}`);
  },
  
  // 获取所有音色
  getAllVoices: () => {
    return api.get('/voices/all');
  },
};

// TTS相关API
export const ttsAPI = {
  // 生成TTS
  generateTTS: async (
    dialogue: { id?: number; title: string; speakers: string[]; content: { speaker: string; text: string }[] }, 
    voiceId: string, 
    speed: number, 
    emotionMode: string
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
  documentAPI,
  voiceAPI,
  ttsAPI,
  dialogueAPI,
}; 