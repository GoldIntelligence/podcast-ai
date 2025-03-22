import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 默认管理员用户（当数据库不可用时使用）
const DEFAULT_ADMIN = {
  id: 0,
  username: 'admin',
  password: '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', // 'admin123' 加密后
};

// 数据库连接状态标志
let isDatabaseConnected = true;

// 测试数据库连接
const testDatabaseConnection = async () => {
  try {
    await User.findOne({ where: { id: 1 } });
    isDatabaseConnected = true;
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    isDatabaseConnected = false;
    return false;
  }
};

// 定期检查数据库连接状态
setInterval(testDatabaseConnection, 60000); // 每分钟检查一次

// 用户注册
export const register = async (req: Request, res: Response) => {
  try {
    // 首先检查数据库连接
    if (!isDatabaseConnected) {
      await testDatabaseConnection();
    }

    if (!isDatabaseConnected) {
      return res.status(503).json({ message: '注册服务暂时不可用，请稍后再试' });
    }

    const { username, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const user = await User.create({
      username,
      password, // 密码会在User模型的hooks中加密
    });

    // 返回成功消息，不包含密码
    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 用户登录
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 检查数据库连接状态
    if (!isDatabaseConnected) {
      await testDatabaseConnection();
    }

    // 如果数据库不可用，但用户使用默认管理员凭据
    if (!isDatabaseConnected) {
      if (username === DEFAULT_ADMIN.username) {
        const isPasswordValid = await bcrypt.compare(password, DEFAULT_ADMIN.password);
        if (isPasswordValid) {
          // 生成JWT令牌
          const token = jwt.sign(
            { id: DEFAULT_ADMIN.id, username: DEFAULT_ADMIN.username },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          // 返回令牌和用户信息
          return res.status(200).json({
            message: '登录成功（离线模式）',
            token,
            user: {
              id: DEFAULT_ADMIN.id,
              username: DEFAULT_ADMIN.username,
            },
          });
        }
      }
      return res.status(401).json({ message: '数据库不可用，仅支持管理员默认登录' });
    }

    // 正常数据库查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回令牌和用户信息
    res.status(200).json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前用户信息
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // 从请求对象中获取用户ID (这需要认证中间件)
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: '未授权' });
    }

    // 检查数据库连接状态
    if (!isDatabaseConnected) {
      await testDatabaseConnection();
    }

    // 如果是默认管理员
    if (userId === DEFAULT_ADMIN.id) {
      return res.status(200).json({
        user: {
          id: DEFAULT_ADMIN.id,
          username: DEFAULT_ADMIN.username,
        },
      });
    }

    // 如果数据库不可用
    if (!isDatabaseConnected) {
      return res.status(503).json({ message: '服务暂时不可用' });
    }

    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 返回用户信息，不包含密码
    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
}; 