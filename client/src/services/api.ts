import axios from 'axios';

// 添加调试信息，展示实际API请求地址
const BASE_URL = 'http://localhost:5001/api';
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
  generateTTS: (script: any, voiceId: string, speed: number = 1, emotionMode: string = 'dialog') => {
    return api.post('/tts/generate', { script, voiceId, speed, emotionMode });
  },
  
  // 获取TTS生成进度
  getTTSProgress: (taskId: string) => {
    return api.get(`/tts/progress/${taskId}`);
  },
  
  // 获取所有播客
  getAllPodcasts: () => {
    return api.get('/tts/podcasts');
  },
  
  // 删除播客
  deletePodcast: (podcastId: string) => {
    return api.delete(`/tts/podcasts/${podcastId}`);
  },
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