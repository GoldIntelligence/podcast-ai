import React, { useState, useEffect } from 'react';
import { Upload, Button, Typography, message, Spin, Card, Select, Space, Modal, List, Tabs, Collapse, Drawer } from 'antd';
import { InboxOutlined, FileTextOutlined, SaveOutlined, LoadingOutlined, FolderOpenOutlined, MenuOutlined } from '@ant-design/icons';
import { documentAPI } from '../services/api';
import ScriptEditor from '../components/Document/ScriptEditor';
import BriefingEditor from '../components/Document/BriefingEditor';
import { dialogueAPI } from '../services/api';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
  updatedAt?: string;
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

interface GroupedContent {
  year: number;
  months: {
    month: number;
    items: (Dialogue | Briefing)[];
  }[];
}

const DocumentPage: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [savedDialogues, setSavedDialogues] = useState<Dialogue[]>([]);
  const [savedBriefings, setSavedBriefings] = useState<Briefing[]>([]);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [currentType, setCurrentType] = useState<'dialogue' | 'briefing' | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 从localStorage加载保存的内容
  useEffect(() => {
    try {
      const savedDialoguesStr = localStorage.getItem('saved_dialogues');
      const savedBriefingsStr = localStorage.getItem('saved_briefings');
      
      if (savedDialoguesStr) {
        const dialogues = JSON.parse(savedDialoguesStr);
        setSavedDialogues(dialogues);
        console.log('从本地存储加载了', dialogues.length, '个对话稿');
      }
      
      if (savedBriefingsStr) {
        const briefings = JSON.parse(savedBriefingsStr);
        setSavedBriefings(briefings);
        console.log('从本地存储加载了', briefings.length, '个资讯简报');
      }
      
      // 尝试将本地存储的内容同步到服务器
      syncLocalContentToServer();
    } catch (e) {
      console.error('从localStorage加载内容失败:', e);
    }
  }, []);
  
  // 将本地内容同步到服务器
  const syncLocalContentToServer = async () => {
    if (!savedDialogues.length && !savedBriefings.length) return;
    
    try {
      console.log('正在同步本地内容到服务器...');
      
      // 同步对话稿
      if (savedDialogues.length > 0) {
        await syncLocalDialoguesToServer(savedDialogues);
      }
      
      // 同步资讯简报
      if (savedBriefings.length > 0) {
        await syncLocalBriefingsToServer(savedBriefings);
      }
      
      console.log('本地内容同步完成');
    } catch (error) {
      console.error('同步本地内容到服务器失败:', error);
    }
  };
  // 将本地对话稿同步到服务器
  const syncLocalDialoguesToServer = async (localDialogues: Dialogue[]) => {
    if (!localDialogues || localDialogues.length === 0) return;
    
    try {
      console.log('正在同步本地对话稿到服务器...');
      // 获取服务器上的对话稿
      const response = await dialogueAPI.getAllDialogues();
      let serverDialogues: any[] = [];
      
      if (response.data && response.data.success && Array.isArray(response.data.dialogues)) {
        serverDialogues = response.data.dialogues;
      } else if (response.data && Array.isArray(response.data)) {
        serverDialogues = response.data;
      }
      
      // 找出服务器上不存在的本地对话稿
      const serverIds = new Set(serverDialogues.map((d: any) => d.id));
      const dialoguesToSync = localDialogues.filter(d => !serverIds.has(d.id));
      
      if (dialoguesToSync.length === 0) {
        console.log('所有本地对话稿已同步到服务器');
        return;
      }
      
      console.log(`准备同步 ${dialoguesToSync.length} 个本地对话稿到服务器`);
      
      // 将本地对话稿保存到服务器
      for (const dialogue of dialoguesToSync) {
        const syncData = {
          title: dialogue.title,
          speakers: dialogue.speakers,
          content: dialogue.content.map(item => ({
            speaker: item.speaker,
            text: item.text
          }))
        };
        
        try {
          await dialogueAPI.saveDialogue(syncData);
          console.log(`对话稿 "${dialogue.title}" 已同步到服务器`);
        } catch (error) {
          console.error(`同步对话稿 "${dialogue.title}" 失败:`, error);
        }
      }
      
      console.log('本地对话稿同步完成');
    } catch (error) {
      console.error('同步本地对话稿到服务器失败:', error);
    }
  };

  // 将本地资讯简报同步到服务器
  const syncLocalBriefingsToServer = async (localBriefings: Briefing[]) => {
    if (!localBriefings || localBriefings.length === 0) return;
    
    try {
      console.log('正在同步本地资讯简报到服务器...');
      // 获取服务器上的资讯简报
      const response = await documentAPI.getAllBriefings();
      let serverBriefings: any[] = [];
      
      if (response.data && response.data.success && Array.isArray(response.data.briefings)) {
        serverBriefings = response.data.briefings;
      } else if (response.data && Array.isArray(response.data)) {
        serverBriefings = response.data;
      }
      
      // 找出服务器上不存在的本地资讯简报
      const serverIds = new Set(serverBriefings.map((b: any) => b.id));
      const briefingsToSync = localBriefings.filter(b => !serverIds.has(b.id));
      
      if (briefingsToSync.length === 0) {
        console.log('所有本地资讯简报已同步到服务器');
        return;
      }
      
      console.log(`准备同步 ${briefingsToSync.length} 个本地资讯简报到服务器`);
      
      // 将本地资讯简报保存到服务器
      for (const briefing of briefingsToSync) {
        const syncData = {
          title: briefing.title,
          summary: briefing.summary,
          key_points: briefing.key_points,
          market_impact: briefing.market_impact,
          expert_opinion: briefing.expert_opinion
        };
        
        try {
          await documentAPI.saveBriefing(syncData);
          console.log(`资讯简报 "${briefing.title}" 已同步到服务器`);
        } catch (error) {
          console.error(`同步资讯简报 "${briefing.title}" 失败:`, error);
        }
      }
      
      console.log('本地资讯简报同步完成');
    } catch (error) {
      console.error('同步本地资讯简报到服务器失败:', error);
    }
  };

  // 从本地存储加载已保存的内容
  const loadSavedContents = () => {
    // 加载保存的对话稿
    const savedDialoguesStr = localStorage.getItem('saved_dialogues');
    if (savedDialoguesStr) {
      try {
        const dialogues = JSON.parse(savedDialoguesStr);
        setSavedDialogues(dialogues);
      } catch (e) {
        console.error('解析已保存对话稿失败:', e);
        setSavedDialogues([]);
      }
    }
    
    // 加载保存的简报
    const savedBriefingsStr = localStorage.getItem('saved_briefings');
    if (savedBriefingsStr) {
      try {
        const briefings = JSON.parse(savedBriefingsStr);
        setSavedBriefings(briefings);
      } catch (e) {
        console.error('解析已保存简报失败:', e);
        setSavedBriefings([]);
      }
    }
  };

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
      // 确保传递正确的文件路径字符串
      const filePath = typeof uploadedFile === 'string' 
        ? uploadedFile 
        : uploadedFile.path || uploadedFile.filePath || uploadedFile;
      
      console.log('生成对话稿使用的文件路径:', filePath);
      const response = await documentAPI.generateScript(filePath);
      
      // 检查响应数据结构
      if (!response.data) {
        throw new Error('服务器响应数据为空');
      }
      
      if (!response.data.success) {
        throw new Error(response.data.message || '生成失败');
      }
      
      if (!response.data.dialogue) {
        throw new Error('返回的对话数据为空');
      }
      
      const { dialogue } = response.data;
      
      // 验证对话数据结构
      if (!dialogue.title || !Array.isArray(dialogue.content) || !Array.isArray(dialogue.speakers)) {
        throw new Error('对话数据格式不正确');
      }
      
      console.log('收到对话稿数据:', dialogue);
      setDialogue(dialogue);
      setCurrentType('dialogue');
      message.success('对话稿生成成功！');
    } catch (error) {
      console.error('生成对话稿失败:', error);
      message.error(error instanceof Error ? error.message : '对话稿生成失败！');
    } finally {
      setGenerating(false);
    }
  };

  // 生成资讯简报
  const handleGenerateBriefing = async () => {
    if (!uploadedFile) {
      message.error('请先上传文件');
      return;
    }

    setGeneratingBriefing(true);
    try {
      // 确保传递正确的文件路径字符串
      const filePath = typeof uploadedFile === 'string' 
        ? uploadedFile 
        : uploadedFile.path || uploadedFile.filePath || uploadedFile;
      
      console.log('生成简报使用的文件路径:', filePath);
      const response = await documentAPI.generateBriefing(filePath, 500);
      console.log('生成简报响应:', response.data);
      
      if (response.data && response.data.success) {
        const briefingData = response.data.briefing;
        setBriefing(briefingData);
        setCurrentType('briefing');
        
        // 将当前简报添加到本地存储
        if (briefingData) {
          const timestamp = new Date().toISOString();
          const newBriefing = {
            ...briefingData,
            id: Date.now().toString(),
            createdAt: timestamp,
            updatedAt: timestamp
          };
          
          // 更新简报
          setBriefing(newBriefing);
          
          // 更新本地存储
          const savedBriefingsStr = localStorage.getItem('saved_briefings');
          let savedBriefings = savedBriefingsStr ? JSON.parse(savedBriefingsStr) : [];
          savedBriefings.push(newBriefing);
          localStorage.setItem('saved_briefings', JSON.stringify(savedBriefings));
          
          // 刷新保存的简报列表
          loadSavedContents();
          
          message.success('简报生成成功并已保存！');
        } else {
          message.warning('简报内容为空');
        }
      } else {
        throw new Error(response.data?.message || '生成简报失败');
      }
    } catch (error) {
      console.error('简报生成错误:', error);
      message.error('简报生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setGeneratingBriefing(false);
    }
  };

  // 处理对话稿编辑
  const handleScriptEdit = (newDialogue: Dialogue) => {
    setDialogue(newDialogue);
    
    // 更新本地存储的对话稿列表
    if (newDialogue.id) {
      try {
        const savedDialoguesStr = localStorage.getItem('saved_dialogues');
        let dialogues = savedDialoguesStr ? JSON.parse(savedDialoguesStr) : [];
        
        // 检查是否需要更新savedDialogues状态
        const existingIndex = savedDialogues.findIndex(d => d.id === newDialogue.id);
        if (existingIndex >= 0) {
          const updatedDialogues = [...savedDialogues];
          updatedDialogues[existingIndex] = newDialogue;
          setSavedDialogues(updatedDialogues);
        }
      } catch (e) {
        console.error('更新本地对话稿状态失败:', e);
      }
    }
  };
  
  // 加载选中的对话稿
  const handleLoadDialogue = (selectedDialogue: Dialogue) => {
    setDialogue(selectedDialogue);
    setCurrentType('dialogue');
    setLoadModalVisible(false);
    message.success(`已加载对话稿: ${selectedDialogue.title}`);
    
    // 如果从本地加载了对话稿，尝试同步到服务器
    if (selectedDialogue && selectedDialogue.id && !selectedDialogue.id.toString().startsWith('server_')) {
      const syncData = {
        title: selectedDialogue.title,
        speakers: selectedDialogue.speakers,
        content: selectedDialogue.content.map(item => ({
          speaker: item.speaker,
          text: item.text
        }))
      };
      
      dialogueAPI.saveDialogue(syncData)
        .then(response => {
          console.log('已加载的对话稿同步到服务器成功:', response.data);
        })
        .catch(error => {
          console.error('同步已加载对话稿到服务器失败:', error);
        });
    }
  };

  // 加载选中的资讯简报
  const handleLoadBriefing = (selectedBriefing: Briefing) => {
    setBriefing(selectedBriefing);
    setCurrentType('briefing');
    setLoadModalVisible(false);
    message.success(`已加载资讯简报: ${selectedBriefing.title}`);
    
    // 如果从本地加载了资讯简报，尝试同步到服务器
    if (selectedBriefing && selectedBriefing.id && !selectedBriefing.id.toString().startsWith('server_')) {
      const syncData = {
        title: selectedBriefing.title,
        summary: selectedBriefing.summary,
        key_points: selectedBriefing.key_points,
        market_impact: selectedBriefing.market_impact,
        expert_opinion: selectedBriefing.expert_opinion
      };
      
      documentAPI.saveBriefing(syncData)
        .then(response => {
          console.log('已加载的资讯简报同步到服务器成功:', response.data);
        })
        .catch(error => {
          console.error('同步已加载资讯简报到服务器失败:', error);
        });
    }
  };

  // 显示加载稿件模态框
  const showLoadModal = () => {
    // 重新从localStorage加载以确保最新
    try {
      const savedDialoguesStr = localStorage.getItem('saved_dialogues');
      const savedBriefingsStr = localStorage.getItem('saved_briefings');
      
      if (savedDialoguesStr) {
        const dialogues = JSON.parse(savedDialoguesStr);
        setSavedDialogues(dialogues);
      }
      
      if (savedBriefingsStr) {
        const briefings = JSON.parse(savedBriefingsStr);
        setSavedBriefings(briefings);
      }
    } catch (e) {
      console.error('从localStorage刷新稿件失败:', e);
    }
    
    setLoadModalVisible(true);
  };

  // 处理资讯简报编辑
  const handleBriefingEdit = (updatedBriefing: Briefing) => {
    // 更新当前简报
    setBriefing(updatedBriefing);
    
    // 可选：同步更新本地存储
    const savedBriefingsStr = localStorage.getItem('saved_briefings');
    if (savedBriefingsStr) {
      let savedBriefings = JSON.parse(savedBriefingsStr);
      const index = savedBriefings.findIndex((b: Briefing) => b.id === updatedBriefing.id);
      
      if (index >= 0) {
        // 更新现有简报
        savedBriefings[index] = {
          ...updatedBriefing,
          updatedAt: new Date().toISOString()
        };
      } else {
        // 添加新简报
        savedBriefings.push({
          ...updatedBriefing,
          id: updatedBriefing.id || Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem('saved_briefings', JSON.stringify(savedBriefings));
      
      // 刷新列表
      loadSavedContents();
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '未知时间';
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 按年月分组内容
  const groupContentByDate = (items: (Dialogue | Briefing)[]): GroupedContent[] => {
    const grouped: { [key: string]: { [key: string]: (Dialogue | Briefing)[] } } = {};
    
    items.forEach(item => {
      const date = new Date(item.createdAt || item.updatedAt || '');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      
      grouped[year][month].push(item);
    });
    
    return Object.entries(grouped)
      .map(([year, months]) => ({
        year: parseInt(year),
        months: Object.entries(months)
          .map(([month, items]) => ({
            month: parseInt(month),
            items: items.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.updatedAt || '');
              const dateB = new Date(b.createdAt || b.updatedAt || '');
              return dateB.getTime() - dateA.getTime();
            })
          }))
          .sort((a, b) => b.month - a.month)
      }))
      .sort((a, b) => b.year - a.year);
  };

  // 渲染内容列表
  const renderContentList = (items: (Dialogue | Briefing)[], type: 'dialogue' | 'briefing') => {
    const groupedContent = groupContentByDate(items);
    
    return (
      <Collapse defaultActiveKey={groupedContent.map(g => g.year.toString())}>
        {groupedContent.map(group => (
          <Collapse.Panel 
            key={group.year.toString()} 
            header={`${group.year}年`}
          >
            {group.months.map(monthGroup => (
              <Collapse key={monthGroup.month}>
                <Collapse.Panel 
                  header={`${monthGroup.month}月`}
                  key={monthGroup.month.toString()}
                >
                  <List
                    dataSource={monthGroup.items}
                    renderItem={(item: Dialogue | Briefing) => (
                      <List.Item
                        actions={[
                          <Button 
                            type="primary"
                            size="small"
                            onClick={() => type === 'dialogue' ? handleLoadDialogue(item as Dialogue) : handleLoadBriefing(item as Briefing)}
                          >
                            加载
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={item.title}
                          description={
                            <div>
                              <p>更新时间: {formatDateTime(item.updatedAt)}</p>
                              <p>
                                {type === 'dialogue' 
                                  ? `段落数: ${(item as Dialogue).content.length}`
                                  : `关键要点数: ${(item as Briefing).key_points.length}`
                                }
                              </p>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Collapse.Panel>
              </Collapse>
            ))}
          </Collapse.Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>文档处理</Title>
          <Text>上传咨询文档，生成对话稿或资讯简报</Text>
        </div>
        <Button 
          type="primary" 
          icon={<MenuOutlined />}
          onClick={() => setDrawerVisible(true)}
        >
          已保存稿件
        </Button>
      </div>
      
      <Card style={{ marginTop: 20 }}>
        <Upload.Dragger
          name="document"
          multiple={false}
          action={`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/documents/upload`}
          fileList={fileList}
          customRequest={handleUpload}
          onChange={handleChange}
          maxCount={1}
          showUploadList={{ showRemoveIcon: true }}
          accept=".txt,.pdf,.docx,.doc"
          disabled={uploading}
          beforeUpload={(file) => {
            // 验证文件类型
            const isValidType = ['.txt','.pdf','.docx','.doc'].some(ext => 
              file.name.toLowerCase().endsWith(ext)
            );
            if (!isValidType) {
              message.error('只能上传TXT、PDF、DOC或DOCX格式的文件！');
              return Upload.LIST_IGNORE;
            }
            
            // 验证文件大小，限制为50MB
            const isLessThan50M = file.size / 1024 / 1024 < 50;
            if (!isLessThan50M) {
              message.error('文件大小不能超过50MB！');
              return Upload.LIST_IGNORE;
            }
            
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .txt, .pdf, .docx, .doc 格式的文件，文件大小不超过50MB
          </p>
        </Upload.Dragger>
        
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<FileTextOutlined />} 
              loading={generatingBriefing}
              onClick={handleGenerateBriefing}
              disabled={!uploadedFile || generating}
            >
              {generatingBriefing ? '生成中...' : '生成资讯简报'}
            </Button>
            
            <Button 
              type="primary" 
              icon={<FileTextOutlined />} 
              loading={generating}
              onClick={handleGenerateScript}
              disabled={!uploadedFile || generatingBriefing}
            >
              {generating ? '生成中...' : '生成对话稿'}
            </Button>
          </Space>
        </div>
      </Card>
      
      {(generating || generatingBriefing) && (
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <Spin tip={generating ? "正在分析文档并生成对话稿..." : "正在分析文档并生成资讯简报..."} />
        </div>
      )}
      
      {dialogue && currentType === 'dialogue' && !generating && !generatingBriefing && (
        <Card title="对话稿编辑器" style={{ marginTop: 20 }}>
          <ScriptEditor dialogue={dialogue} onDialogueChange={handleScriptEdit} />
        </Card>
      )}
      
      {briefing && currentType === 'briefing' && !generating && !generatingBriefing && (
        <Card title="资讯简报编辑器" style={{ marginTop: 20 }}>
          <BriefingEditor briefing={briefing} onBriefingChange={handleBriefingEdit} />
        </Card>
      )}
      
      {/* 侧边栏 */}
      <Drawer
        title="已保存稿件"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={600}
      >
        <Tabs
          items={[
            {
              key: 'briefing',
              label: '资讯简报',
              children: renderContentList(savedBriefings, 'briefing')
            },
            {
              key: 'dialogue',
              label: '对话稿',
              children: renderContentList(savedDialogues, 'dialogue')
            }
          ]}
        />
      </Drawer>
    </div>
  );
};

export default DocumentPage; 