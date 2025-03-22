import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Avatar, Dropdown, Space } from 'antd';
import {
  FileTextOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  DownloadOutlined,
  SaveOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';

// 页面组件
import DocumentPage from './pages/DocumentPage';
import VoicePage from './pages/VoicePage';
import TTSPage from './pages/TTSPage';
import DownloadPage from './pages/DownloadPage';
import SavedScripts from './components/SavedScripts/SavedScripts';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// 认证上下文
import { AuthProvider, useAuth } from './context/AuthContext';

import './App.css';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

// 导航菜单组件
const NavigationMenu: React.FC = () => {
  const { user, logout } = useAuth();
  
  const userMenu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: '16px 0' }}>播客生成系统</Title>
        {user && (
          <Dropdown overlay={userMenu}>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <span>{user.username}</span>
            </Space>
          </Dropdown>
        )}
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
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DocumentPage />} />
                <Route path="/saved-scripts" element={<SavedScripts />} />
                <Route path="/voice" element={<VoicePage />} />
                <Route path="/tts" element={<TTSPage />} />
                <Route path="/download" element={<DownloadPage />} />
              </Route>
            </Routes>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            播客生成系统 ©{new Date().getFullYear()} 版权所有
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<NavigationMenu />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;