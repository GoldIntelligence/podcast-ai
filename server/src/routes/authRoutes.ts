import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// 注册路由
router.post('/register', register as any);

// 登录路由
router.post('/login', login as any);

// 获取当前用户信息路由（需要认证）
router.get('/me', authenticate as any, getCurrentUser as any);

export default router; 