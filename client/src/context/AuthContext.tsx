import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { message } from 'antd';

// 用户类型
interface User {
  id: number;
  username: string;
}

// 认证上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string) => Promise<boolean>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => false,
  logout: () => {},
  register: async () => false,
});

// 认证上下文提供者Props
interface AuthProviderProps {
  children: ReactNode;
}

// 从localStorage中恢复用户信息
const restoreUserFromLocalStorage = (): User | null => {
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
  } catch (e) {
    console.error('从localStorage恢复用户信息失败:', e);
    localStorage.removeItem('user');
  }
  return null;
};

// 认证上下文提供者
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(restoreUserFromLocalStorage());
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem('token'));

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('获取用户信息失败:', error);
          // 尝试从localStorage恢复用户信息（离线模式）
          const savedUser = restoreUserFromLocalStorage();
          if (savedUser) {
            setUser(savedUser);
            setIsAuthenticated(true);
            console.log('从localStorage恢复用户会话（离线模式）');
          } else {
            // 清除无效的令牌
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 登录方法
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      setLoading(false);
      message.success(response.data.message || '登录成功');
      return true;
    } catch (error: any) {
      console.error('登录失败:', error);
      let errorMsg = '登录失败，请检查用户名和密码';
      
      // 尝试从错误响应中提取消息
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      }
      
      // 如果是网络错误且用户是admin，尝试离线登录
      if ((error.message.includes('Network Error') || !error.response) && username === 'admin') {
        try {
          // 在客户端模拟离线登录
          const offlineUser = { id: 0, username: 'admin' };
          localStorage.setItem('token', 'offline-token');
          localStorage.setItem('user', JSON.stringify(offlineUser));
          
          setUser(offlineUser);
          setIsAuthenticated(true);
          setLoading(false);
          message.warning('已切换到离线模式，部分功能可能不可用');
          return true;
        } catch (offlineError) {
          console.error('离线登录失败:', offlineError);
        }
      }
      
      message.error(errorMsg);
      setLoading(false);
      return false;
    }
  };

  // 登出方法
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    message.success('已退出登录');
  };

  // 注册方法
  const register = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      await authAPI.register(username, password);
      setLoading(false);
      message.success('注册成功，请登录');
      return true;
    } catch (error: any) {
      console.error('注册失败:', error);
      let errorMsg = '注册失败，用户名可能已存在';
      
      // 尝试从错误响应中提取消息
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      }
      
      message.error(errorMsg);
      setLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的自定义Hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 