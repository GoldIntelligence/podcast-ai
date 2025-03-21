import React, { useState, useEffect } from 'react';
import { Form, Input, Button, List, Space, message, Select, Modal, Progress } from 'antd';
import { PlusOutlined, MinusCircleOutlined, AudioOutlined } from '@ant-design/icons';
import { documentAPI, voiceAPI, ttsAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

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

interface Voice {
  id: string;
  name: string;
  usedForBriefing: boolean;
}

interface BriefingEditorProps {
  briefing: Briefing;
  onBriefingChange: (briefing: Briefing) => void;
}

const BriefingEditor: React.FC<BriefingEditorProps> = ({ briefing, onBriefingChange }) => {
  const [form] = Form.useForm();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('langxianping');
  const [ttsModalVisible, setTtsModalVisible] = useState(false);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  
  const navigate = useNavigate();

  // 语音选项
  const voiceOptions = [
    { value: 'langxianping', label: '郎咸平' },
    { value: 'lidaxiao', label: '李大霄' }
  ];

  // 加载音色列表
  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const response = await voiceAPI.getAllVoices();
      if (response.data.success) {
        const briefingVoices = response.data.voices.filter((v: Voice) => v.usedForBriefing);
        setVoices(briefingVoices);
        if (briefingVoices.length > 0) {
          setSelectedVoice(briefingVoices[0].id);
        }
      }
    } catch (error) {
      console.error('加载音色失败:', error);
    }
  };

  // 保存资讯简报
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updatedBriefing = {
        ...briefing,
        ...values,
        id: briefing.id || Date.now().toString() // 确保有ID
      };
      
      // 更新本地存储
      const savedBriefingsStr = localStorage.getItem('saved_briefings');
      let savedBriefings = savedBriefingsStr ? JSON.parse(savedBriefingsStr) : [];
      
      const existingIndex = savedBriefings.findIndex((b: Briefing) => b.id === updatedBriefing.id);
      if (existingIndex >= 0) {
        savedBriefings[existingIndex] = updatedBriefing;
      } else {
        savedBriefings.push(updatedBriefing);
      }
      
      localStorage.setItem('saved_briefings', JSON.stringify(savedBriefings));
      
      // 同步到服务器
      const response = await documentAPI.saveBriefing(updatedBriefing);
      if (response.data.success) {
        message.success('简报保存成功！');
        onBriefingChange(updatedBriefing);
      } else {
        throw new Error(response.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存简报失败:', error);
      message.error(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 直接生成语音（无需打开选择音色的模态框）
  const handleDirectTTS = async () => {
    try {
      message.loading({ content: '提交TTS合成任务...', key: 'ttsTask', duration: 0 });

      // 构建语音文本
      const script = `
今日简讯：${briefing.title}

${briefing.summary}

关键要点：
${briefing.key_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}
${briefing.market_impact ? `市场影响：\n${briefing.market_impact}\n` : ''}
${briefing.expert_opinion ? `专家观点：\n${briefing.expert_opinion}` : ''}
      `.trim();

      // 保存简报到localStorage，供TTS页面使用
      try {
        // 确保有唯一的ID
        const briefingForTTS = {
          ...briefing,
          id: briefing.id || Date.now().toString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('current_briefing_for_tts', JSON.stringify(briefingForTTS));
      } catch (error) {
        console.error('保存简报到localStorage失败:', error);
      }

      // 调用TTS API开始合成
      const response = await ttsAPI.generateTTS(
        {
          title: briefing.title,
          speakers: ['主播'],
          content: [
            { speaker: '主播', text: script }
          ]
        },
        'langxianping', // 默认使用郎咸平音色
        1, // 默认语速
        'briefing' // 简报模式
      );

      if (response.data && response.data.success) {
        message.success({ content: 'TTS合成任务已提交！正在跳转到TTS页面查看进度...', key: 'ttsTask', duration: 2 });
        // 跳转到TTS页面并直接显示任务进度
        navigate(`/tts?taskId=${response.data.taskId}&type=briefing`);
      } else {
        message.error({ content: '提交TTS任务失败', key: 'ttsTask' });
      }
    } catch (error) {
      console.error('TTS任务提交失败:', error);
      message.error({ content: '提交TTS任务失败，请重试', key: 'ttsTask' });
    }
  };

  // 生成语音（打开选择音色的模态框）
  const handleGenerateTts = async () => {
    if (!briefing) return;
    
    setGeneratingTts(true);
    setTtsProgress(0);
    
    try {
      console.log(briefing);
      // 构建语音文本
      const script = `
今日简讯：${briefing.title}

${briefing.summary}

关键要点：
${briefing.key_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}

${briefing.market_impact ? `市场影响：\n${briefing.market_impact}\n` : ''}
${briefing.expert_opinion ? `专家观点：\n${briefing.expert_opinion}` : ''}
      `.trim();
      // 保存简报到localStorage，供TTS页面使用
      try {
        // 确保有唯一的ID
        const briefingForTTS = {
          ...briefing,
          id: briefing.id || Date.now().toString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('current_briefing_for_tts', JSON.stringify(briefingForTTS));
      } catch (error) {
        console.error('保存简报到localStorage失败:', error);
      }
      // 调用TTS API开始合成
      const response = await ttsAPI.generateTTS(
        {
          title: briefing.title,
          speakers: ['主播'],
          content: [
            { speaker: '主播', text: script }
          ]
        },
        selectedVoice,
        1, // 默认语速
        'briefing' // 简报模式
      );

      if (response.data && response.data.success) {
        message.success({ content: 'TTS合成任务已提交！正在跳转到TTS页面查看进度...', key: 'ttsTask', duration: 2 });
        // 关闭模态框
        setTtsModalVisible(false);
        // 跳转到TTS页面查看进度
        navigate(`/tts?taskId=${response.data.taskId}&type=briefing`);
      } else {
        throw new Error(response.data.message || '语音生成失败');
      }
    } catch (error) {
      console.error('生成语音失败:', error);
      message.error(error instanceof Error ? error.message : '语音生成失败');
    } finally {
      setGeneratingTts(false);
    }
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={briefing}
        onValuesChange={(_, allValues) => {
          onBriefingChange({ ...briefing, ...allValues });
        }}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item
          name="summary"
          label="概述"
          rules={[{ required: true, message: '请输入概述' }]}
        >
          <TextArea rows={4} placeholder="请输入概述" />
        </Form.Item>

        <Form.Item label="关键要点">
          <Form.List name="key_points">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={name}
                      rules={[{ required: true, message: '请输入关键要点' }]}
                    >
                      <Input placeholder="请输入关键要点" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加关键要点
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item
          name="market_impact"
          label="市场影响"
        >
          <TextArea rows={4} placeholder="请输入市场影响分析" />
        </Form.Item>

        <Form.Item
          name="expert_opinion"
          label="专家观点"
        >
          <TextArea rows={4} placeholder="请输入专家观点" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
            <Button 
              type="primary" 
              icon={<AudioOutlined />}
              onClick={handleDirectTTS}
            >
              生成语音
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title="选择音色"
        open={ttsModalVisible}
        onCancel={() => !generatingTts && setTtsModalVisible(false)}
        onOk={handleGenerateTts}
        confirmLoading={generatingTts}
        okButtonProps={{ disabled: generatingTts }}
        cancelButtonProps={{ disabled: generatingTts }}
        closable={!generatingTts}
        maskClosable={!generatingTts}
      >
        <Form layout="vertical">
          <Form.Item label="选择音色">
            <Select
              value={selectedVoice}
              onChange={setSelectedVoice}
              options={voiceOptions}
              disabled={generatingTts}
            />
          </Form.Item>
          {generatingTts && (
            <Form.Item label="生成进度">
              <Progress 
                percent={ttsProgress} 
                status={ttsProgress >= 100 ? 'success' : 'active'} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                {ttsProgress < 100 ? '正在生成语音，请耐心等待...' : '语音生成完成！'}
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default BriefingEditor; 