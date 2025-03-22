import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd';
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

// 菜单项配置
const menuItems = [
  {
    key: 'document',
    icon: <FileTextOutlined />,
    label: '文档处理',
    path: '/',
    element: <DocumentPage />
  },
  {
    key: 'saved-scripts',
    icon: <SaveOutlined />,
    label: '已保存稿件',
    path: '/saved-scripts',
    element: <SavedScripts />
  },
  {
    key: 'voice',
    icon: <SoundOutlined />,
    label: '音色克隆',
    path: '/voice',
    element: <VoicePage />
  },
  {
    key: 'tts',
    icon: <CustomerServiceOutlined />,
    label: '播客合成',
    path: '/tts',
    element: <TTSPage />
  },
  {
    key: 'download',
    icon: <DownloadOutlined />,
    label: '下载中心',
    path: '/download',
    element: <DownloadPage />
  }
];

// 用户菜单组件
const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  const userMenu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={userMenu}>
      <Space>
        <Avatar icon={<UserOutlined />} />
        <span>{user.username}</span>
      </Space>
    </Dropdown>
  );
};

// 导航菜单组件
const NavigationMenu: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Title level={3} style={{ margin: '16px 0' }}>播客生成系统</Title>
        <UserMenu />
      </Header>
      
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['document']}
            style={{ height: '100%', borderRight: 0 }}
          >
            {menuItems.map(item => (
              <Menu.Item key={item.key} icon={item.icon}>
                <Link to={item.path}>{item.label}</Link>
              </Menu.Item>
            ))}
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
                {menuItems.map(item => (
                  <Route key={item.key} path={item.path} element={item.element} />
                ))}
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

// 主应用组件
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