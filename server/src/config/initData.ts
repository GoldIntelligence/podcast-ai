import User from '../models/User';
import bcrypt from 'bcrypt';

// 初始化用户数据
export const initUsers = async () => {
  try {
    // 检查是否已存在管理员用户
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      console.log('创建默认管理员用户...');
      
      // 创建管理员用户
      await User.create({
        username: 'admin',
        password: 'admin123', // 这会在用户模型的hooks中加密
      });
      
      console.log('默认管理员用户创建成功');
    } else {
      console.log('管理员用户已存在，跳过创建');
    }
    
    return true;
  } catch (error) {
    console.error('初始化用户数据失败:', error);
    return false;
  }
};

// 导出所有初始化函数
export const initAllData = async () => {
  try {
    await initUsers();
    console.log('所有数据初始化完成');
    return true;
  } catch (error) {
    console.error('数据初始化失败:', error);
    return false;
  }
}; 