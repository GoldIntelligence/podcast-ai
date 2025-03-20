FROM node:18-alpine

WORKDIR /app

# 复制源代码
COPY . .
# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装必要的工具和Python
RUN apk add netcat-openbsd python3 py3-pip ffmpeg

# 允许安装pip包到系统Python（仅在容器环境中安全）
RUN pip3 install --break-system-packages pydub

# 安装依赖（包括开发依赖，用于构建）
RUN npm ci

# 使脚本可执行
RUN chmod +x wait-for-mysql.sh

# 创建上传和生成目录并设置权限
RUN mkdir -p uploads/documents uploads/voices uploads/dialogues generated/audio && \
    chmod -R 777 uploads generated

# 检查目录结构
RUN ls -la && \
    echo "检查TypeScript配置" && \
    cat tsconfig.json

# 构建项目
RUN npm run build && \
    echo "构建完成，检查dist目录" && \
    ls -la dist || echo "dist目录不存在!" && \
    find . -name "index.js"

# 暴露端口
EXPOSE 5001

# 使用等待脚本确保MySQL准备好再启动应用
CMD ["./wait-for-mysql.sh", "mysql", "3306", "node", "dist/index.js"] 