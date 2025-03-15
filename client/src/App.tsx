import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import {
  FileTextOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  DownloadOutlined,
  SaveOutlined
} from '@ant-design/icons';

// 页面组件
import DocumentPage from './pages/DocumentPage';
import VoicePage from './pages/VoicePage';
import TTSPage from './pages/TTSPage';
import DownloadPage from './pages/DownloadPage';
import SavedScripts from './components/SavedScripts/SavedScripts';

import './App.css';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 20px' }}>
          <Title level={3} style={{ margin: '16px 0' }}>播客生成系统</Title>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: '#fff' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['document']}
              style={{ height: '100%', borderRight: 0 }}
            >
              <Menu.Item key="document" icon={<FileTextOutlined />}>
                <Link to="/">文档处理</Link>
              </Menu.Item>
              <Menu.Item key="saved-scripts" icon={<SaveOutlined />}>
                <Link to="/saved-scripts">已保存稿件</Link>
              </Menu.Item>
              <Menu.Item key="voice" icon={<SoundOutlined />}>
                <Link to="/voice">音色克隆</Link>
              </Menu.Item>
              <Menu.Item key="tts" icon={<CustomerServiceOutlined />}>
                <Link to="/tts">播客合成</Link>
              </Menu.Item>
              <Menu.Item key="download" icon={<DownloadOutlined />}>
                <Link to="/download">下载中心</Link>
              </Menu.Item>
            </Menu>
          </Sider>
          <Layout style={{ padding: '24px' }}>
            <Content
              style={{
                background: '#fff',
                padding: 24,
                margin: 0,
                minHeight: 280,
              }}
            >
              <Routes>
                <Route path="/" element={<DocumentPage />} />
                <Route path="/saved-scripts" element={<SavedScripts />} />
                <Route path="/voice" element={<VoicePage />} />
                <Route path="/tts" element={<TTSPage />} />
                <Route path="/download" element={<DownloadPage />} />
              </Routes>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              播客生成系统 ©{new Date().getFullYear()} 版权所有
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;