import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 认证中间件
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    
    // 将用户信息添加到请求对象中
    (req as any).userId = decoded.id;
    (req as any).username = decoded.username;
    
    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};

// 可选的认证中间件，不会阻止未认证的请求
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // 没有提供令牌，但允许继续
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    
    // 将用户信息添加到请求对象中
    (req as any).userId = decoded.id;
    (req as any).username = decoded.username;
    
    next();
  } catch (error) {
    // 令牌无效，但允许请求继续
    next();
  }
}; 