import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default {
  documentAPI,
  voiceAPI,
  ttsAPI,
}; 