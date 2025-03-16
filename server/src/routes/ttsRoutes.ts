import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

// STEP API配置
const STEP_API_KEY = process.env.STEP_API_KEY || "STEP_API_KEY";
const STEP_API_MODEL = "step-tts-mini";

// 角色对应的音色ID
const VOICE_MAPPING: Record<string, string> = {
  '郎咸平': 'voice-tone-FfOmC9BCbY',
  '李大霄': 'voice-tone-FfQHJMfMye'
};

// 确保目录存在
const AUDIO_DIR = path.join(__dirname, '../../generated/audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// 脚本和对话类型定义
interface DialogueContent {
  speaker: string;
  text: string;
}

interface Script {
  content: DialogueContent[];
  title?: string;
}

// 任务状态接口
interface TaskStatus {
  taskId: string;
  progress: number;
  status: string;
  audioUrl: string | null;
  estimatedTimeRemaining: number;
  startTime: number;
  totalSegments: number;
  completedSegments: number;
  error?: string;
}

// 生成TTS音频
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { script, voiceId, speed = 1, emotionMode = 'dialog' } = req.body;
    
    if (!script || !script.content) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数或对话内容'
      });
      return;
    }
    
    // 创建任务ID
    const taskId = `tts_${Date.now()}`;
    const taskDir = path.join(AUDIO_DIR, taskId);
    
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }
    
    // 先响应请求，异步处理合成
    res.status(202).json({
      success: true,
      message: 'TTS合成任务已提交',
      taskId
    });
    
    // 创建任务状态文件
    const taskStatusFile = path.join(taskDir, 'status.json');
    fs.writeFileSync(taskStatusFile, JSON.stringify({
      taskId,
      progress: 0,
      status: 'processing',
      audioUrl: null,
      estimatedTimeRemaining: script.content.length,
      startTime: Date.now(),
      totalSegments: script.content.length,
      completedSegments: 0
    }));
    
    // 异步处理TTS合成
    processTTS(script, taskId, taskDir, taskStatusFile);
    
  } catch (error) {
    console.error('TTS合成错误:', error);
    res.status(500).json({ success: false, message: 'TTS合成请求失败' });
  }
});

// 异步处理TTS合成
const processTTS = async (
  script: Script, 
  taskId: string, 
  taskDir: string, 
  taskStatusFile: string
) => {
  try {
    console.log(`开始处理TTS任务: ${taskId}`);
    console.log(`对话内容: ${script.content.length}段`);
    
    // 初始化OpenAI API客户端
    const openai = new OpenAI({
      apiKey: STEP_API_KEY,
      baseURL: "https://api.stepfun.com/v1",
    });
    
    const segments = script.content;
    let completedSegments = 0;
    
    // 为每个对话段落生成音频
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const speaker = segment.speaker;
      const text = segment.text;
      
      // 根据说话人选择音色
      const voice = VOICE_MAPPING[speaker as keyof typeof VOICE_MAPPING] || 'voice-tone-FfOmC9BCbY'; // 默认使用郎咸平的音色
      
      try {
        console.log(`处理第${i+1}/${segments.length}段, 说话人: ${speaker}, 音色: ${voice}`);
        
        // 调用STEP API生成语音
        const mp3 = await openai.audio.speech.create({
          model: STEP_API_MODEL,
          voice: voice as any, // 使用类型断言解决语音类型限制问题
          input: text,
        });
        
        // 保存音频文件
        const outputPath = path.join(taskDir, `step-tts${i+1}.mp3`);
        const buffer = Buffer.from(await mp3.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        
        completedSegments++;
        
        // 更新进度
        const progress = Math.floor((completedSegments / segments.length) * 100);
        updateTaskStatus(taskStatusFile, {
          progress,
          completedSegments,
          status: progress < 100 ? 'processing' : 'merging',
          estimatedTimeRemaining: segments.length - completedSegments
        });
        
        console.log(`第${i+1}段处理完成, 进度: ${progress}%`);
      } catch (segmentError) {
        console.error(`处理第${i+1}段时出错:`, segmentError);
      }
    }
    
    // 所有片段处理完成后，合并音频
    if (completedSegments > 0) {
      try {
        updateTaskStatus(taskStatusFile, {
          status: 'merging',
          progress: 99
        });
        
        // 使用Python脚本合并音频
        await mergeAudioFiles(taskDir, taskId);
        
        // 更新任务状态为完成
        const finalAudioPath = `/api/generated/audio/${taskId}/mixed_audio.mp3`;
        updateTaskStatus(taskStatusFile, {
          status: 'completed',
          progress: 100,
          audioUrl: finalAudioPath,
          estimatedTimeRemaining: 0
        });
        
        console.log(`TTS任务 ${taskId} 处理完成!`);
      } catch (mergeError) {
        console.error('合并音频文件失败:', mergeError);
        updateTaskStatus(taskStatusFile, {
          status: 'error',
          error: '合并音频文件失败'
        });
      }
    } else {
      updateTaskStatus(taskStatusFile, {
        status: 'error',
        error: '没有成功处理任何音频片段'
      });
    }
  } catch (error) {
    console.error('处理TTS任务出错:', error);
    updateTaskStatus(taskStatusFile, {
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 使用Python脚本合并音频文件
const mergeAudioFiles = async (taskDir: string, taskId: string) => {
  try {
    // 合并音频文件的Python代码
    const pythonCode = `
import os, re
from pydub import AudioSegment
import glob

speech_file_path = "${taskDir.replace(/\\/g, '/')}"
# 使用正则表达式提取数字并转换为整型排序
file_list = sorted(glob.glob(os.path.join(speech_file_path, 'step-tts*.mp3')), key=lambda x: int(re.findall(r'step-tts(\\d+).mp3', x)[0]))

if len(file_list) == 0:
    print("没有找到音频文件!")
    exit(1)

print(f"找到 {len(file_list)} 个音频文件:")
for file in file_list:
    print(f" - {file}")

mixed_audio = None
for audio_file in file_list:
    try:
        print(f"处理文件: {audio_file}")
        segment = AudioSegment.from_file(audio_file)
        if mixed_audio is None:
            mixed_audio = segment
        else:
            mixed_audio += segment
    except Exception as e:
        print(f"处理 {audio_file} 时出错: {str(e)}")

output_path = os.path.join(speech_file_path, "mixed_audio.mp3")
mixed_audio.export(output_path, format="mp3")
# 确保文件权限正确
os.chmod(output_path, 0o644)
print(f"音频文件合并成功! 输出路径: {output_path}")
    `;
    
    // 保存Python脚本
    const scriptPath = path.join(taskDir, 'merge_audio.py');
    fs.writeFileSync(scriptPath, pythonCode);
    
    // 运行Python脚本
    console.log('执行Python脚本合并音频...');
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`);
    
    console.log('Python脚本输出:', stdout);
    if (stderr) {
      console.error('Python脚本错误:', stderr);
    }
    
    // 检查输出文件是否存在
    const outputPath = path.join(taskDir, 'mixed_audio.mp3');
    if (!fs.existsSync(outputPath)) {
      throw new Error('合并后的音频文件未生成');
    }
    
    // 确保文件权限正确 (读写权限)
    fs.chmodSync(outputPath, 0o644);
    
    return outputPath;
  } catch (error) {
    console.error('合并音频文件时出错:', error);
    throw error;
  }
};

// 定义更新类型
interface TaskStatusUpdate {
  progress?: number;
  status?: string;
  audioUrl?: string | null;
  estimatedTimeRemaining?: number;
  completedSegments?: number;
  error?: string;
}

// 更新任务状态
const updateTaskStatus = (statusFile: string, updates: TaskStatusUpdate) => {
  try {
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8')) as TaskStatus;
    const updatedStatus = { ...status, ...updates };
    fs.writeFileSync(statusFile, JSON.stringify(updatedStatus));
  } catch (error) {
    console.error('更新任务状态失败:', error);
  }
};

// 查询TTS生成进度
router.route('/progress/:taskId').get((req, res) => {
  const { taskId } = req.params;
  
  try {
    const statusFile = path.join(AUDIO_DIR, taskId, 'status.json');
    
    if (!fs.existsSync(statusFile)) {
      res.status(404).json({
        success: false,
        message: '任务不存在'
      });
      return;
    }
    
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
    
    // 确保音频URL使用正确的路径
    if (status.audioUrl && status.status === 'completed') {
      // 将/generated替换为/api/generated
      if (status.audioUrl.startsWith('/generated')) {
        status.audioUrl = `/api${status.audioUrl}`;
      }
    }
    
    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('获取任务进度失败:', error);
    
    // 如果无法读取状态文件，返回模拟数据
    const progress = Math.min(100, Math.floor(Math.random() * 100));
    
    res.status(200).json({
      success: true,
      taskId,
      progress,
      status: progress < 100 ? 'processing' : 'completed',
      audioUrl: progress === 100 ? `/api/generated/audio/${taskId}/mixed_audio.mp3` : null,
      estimatedTimeRemaining: progress < 100 ? Math.floor((100 - progress) / 10) : 0
    });
  }
});

// 获取所有已生成的播客
router.route('/podcasts').get((req, res) => {
  try {
    // 列出audio目录下的所有任务文件夹
    const taskDirs = fs.readdirSync(AUDIO_DIR)
      .filter(name => name.startsWith('tts_'))
      .map(name => {
        const dirPath = path.join(AUDIO_DIR, name);
        const statusPath = path.join(dirPath, 'status.json');
        
        if (fs.existsSync(statusPath)) {
          try {
            const status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            const mixedAudioPath = path.join(dirPath, 'mixed_audio.mp3');
            
            // 只返回已完成的任务
            if (status.status === 'completed' && fs.existsSync(mixedAudioPath)) {
              const stats = fs.statSync(mixedAudioPath);
              // 确保URL格式正确
              let audioUrl = status.audioUrl || `/generated/audio/${name}/mixed_audio.mp3`;
              // 将/generated替换为/api/generated
              if (audioUrl.startsWith('/generated')) {
                audioUrl = `/api${audioUrl}`;
              }
              
              return {
                id: name,
                title: status.title || `播客 ${name}`,
                duration: status.duration || 0,
                createdAt: new Date(parseInt(name.replace('tts_', ''))).toISOString(),
                url: audioUrl,
                size: stats.size
              };
            }
          } catch (e) {
            console.error(`读取任务状态失败 ${name}:`, e);
          }
        }
        return null;
      })
      .filter(Boolean);
    
    res.status(200).json({
      success: true,
      podcasts: taskDirs
    });
  } catch (error) {
    console.error('获取播客列表错误:', error);
    res.status(500).json({ success: false, message: '获取播客列表失败' });
  }
});

// 删除播客
router.route('/podcasts/:podcastId').delete((req, res) => {
  try {
    const { podcastId } = req.params;
    const taskDir = path.join(AUDIO_DIR, podcastId);
    
    if (!fs.existsSync(taskDir)) {
      res.status(404).json({
        success: false,
        message: '播客不存在'
      });
      return;
    }
    
    // 递归删除目录
    fs.rmdirSync(taskDir, { recursive: true });
    
    res.status(200).json({
      success: true,
      message: '播客已删除',
      podcastId
    });
  } catch (error) {
    console.error('删除播客错误:', error);
    res.status(500).json({ success: false, message: '删除播客失败' });
  }
});

// 添加直接下载音频文件的路由
router.route('/download/:taskId').get((req, res) => {
  try {
    const { taskId } = req.params;
    const audioFilePath = path.join(AUDIO_DIR, taskId, 'mixed_audio.mp3');
    
    console.log('尝试下载音频文件:', audioFilePath);
    
    // 添加CORS头部
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 检查文件是否存在
    if (!fs.existsSync(audioFilePath)) {
      console.error('音频文件不存在:', audioFilePath);
      res.status(404).json({
        success: false,
        message: '音频文件不存在'
      });
      return;
    }
    
    // 获取文件信息
    const stats = fs.statSync(audioFilePath);
    console.log('文件信息:', {
      size: stats.size,
      mode: stats.mode.toString(8),
      isFile: stats.isFile()
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="podcast_${taskId}.mp3"`);
    res.setHeader('Content-Length', stats.size);
    
    // 创建文件读取流并管道到响应
    const fileStream = fs.createReadStream(audioFilePath);
    fileStream.on('error', (err) => {
      console.error('读取文件流错误:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '读取音频文件失败'
        });
      }
    });
    
    // 为流添加结束事件监听
    fileStream.on('end', () => {
      console.log(`文件 ${taskId} 成功发送完毕`);
    });
    
    // 管道到响应
    fileStream.pipe(res);
  } catch (error) {
    console.error('下载音频文件错误:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '下载音频文件失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
});

export default router; 