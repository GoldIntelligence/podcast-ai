#!/bin/bash

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示标题
echo -e "${GREEN}=== 播客AI系统部署脚本 ===${NC}"
echo

# 检查Docker是否安装
if ! command -v docker &> /dev/null || ! command -v docker compose &> /dev/null; then
    echo -e "${RED}错误: 请先安装Docker和Docker Compose${NC}"
    exit 1
fi

# 清理旧容器（如果存在）
echo -e "${YELLOW}清理旧容器...${NC}"
docker compose down -v 2>/dev/null

# 显示当前服务器目录结构
echo -e "${YELLOW}检查项目结构...${NC}"
ls -la

# 确保文件夹权限正确
echo -e "${YELLOW}设置文件夹权限...${NC}"
mkdir -p server/uploads server/generated db/init
chmod -R 777 server/uploads server/generated

# 预先拉取MySQL镜像
echo -e "${YELLOW}预先拉取MySQL镜像...${NC}"
docker pull mysql:8.0 || {
    echo -e "${RED}MySQL镜像拉取失败，尝试使用镜像仓库...${NC}"
    # 尝试使用镜像仓库
    docker pull mysql/mysql-server:8.0 || {
        echo -e "${RED}无法拉取MySQL镜像，请检查网络连接或使用本地MySQL${NC}"
        # 修改docker-compose.yml使用本地MySQL配置
        sed -i -e 's/image: mysql:8.0/image: mysql:5.7/' docker-compose.yml 2>/dev/null
        sed -i '' -e 's/image: mysql:8.0/image: mysql:5.7/' docker-compose.yml 2>/dev/null
        docker pull mysql:5.7 || {
            echo -e "${RED}无法拉取任何MySQL镜像，请手动设置数据库${NC}"
        }
    }
}

# 构建并启动容器
echo -e "${YELLOW}构建并启动容器...${NC}"
# docker compose build --no-cache || {
#     echo -e "${RED}构建失败，尝试单独构建每个服务...${NC}"
#     docker compose build --no-cache frontend
#     docker compose build --no-cache backend
#     docker compose build --no-cache mysql
# }

docker compose build || {
    echo -e "${RED}构建失败，尝试单独构建每个服务...${NC}"
    docker compose build frontend
    docker compose build backend
    docker compose build mysql
}

# 启动服务
echo -e "${YELLOW}启动服务...${NC}"
docker compose up -d || {
    echo -e "${RED}启动服务失败，尝试单独启动...${NC}"
    docker compose up -d mysql
    sleep 10
    docker compose up -d backend
    docker compose up -d frontend
}

# 等待MySQL容器启动
echo -e "${YELLOW}等待MySQL初始化...${NC}"
sleep 15

# 显示MySQL容器状态
MYSQL_CONTAINER=$(docker ps | grep podcast-ai-mysql || echo "")
if [ -n "$MYSQL_CONTAINER" ]; then
    echo -e "${YELLOW}MySQL容器状态:${NC}"
    docker logs podcast-ai-mysql | tail -20
else
    echo -e "${RED}MySQL容器未运行${NC}"
fi

# 显示容器日志
echo -e "${YELLOW}显示容器日志（10秒）...${NC}"
docker compose logs --follow --tail=50 &
LOG_PID=$!
sleep 10
kill $LOG_PID 2>/dev/null

# 检查容器是否正常运行
echo -e "${YELLOW}检查容器状态...${NC}"
FRONTEND_STATUS=$(docker ps | grep podcast-ai-frontend-1 | grep -i "Up" || echo "")
BACKEND_STATUS=$(docker ps | grep podcast-ai-backend-1 | grep -i "Up" || echo "")
MYSQL_STATUS=$(docker ps | grep podcast-ai-mysql | grep -i "Up" || echo "")

if [ -n "$FRONTEND_STATUS" ] && [ -n "$BACKEND_STATUS" ] && [ -n "$MYSQL_STATUS" ]; then
    echo -e "${GREEN}部署成功!${NC}"
    echo -e "前端: ${GREEN}运行中${NC} - 访问 http://localhost"
    echo -e "后端: ${GREEN}运行中${NC} - API地址 http://localhost/api"
    echo -e "数据库: ${GREEN}运行中${NC} - MySQL"
    echo
    echo -e "${YELLOW}查看日志: ${NC}docker compose logs -f"
    
else
    echo -e "${RED}部署有问题，查看容器状态:${NC}"
    docker ps
    echo
    if [ -z "$FRONTEND_STATUS" ]; then
        echo -e "${YELLOW}前端日志:${NC}"
        docker logs podcast-ai-frontend-1 2>/dev/null || echo "无法获取前端日志"
        echo
    fi
    if [ -z "$BACKEND_STATUS" ]; then
        echo -e "${YELLOW}后端日志:${NC}"
        docker logs podcast-ai-backend-1 2>/dev/null || echo "无法获取后端日志"
        echo
    fi
    if [ -z "$MYSQL_STATUS" ]; then
        echo -e "${YELLOW}数据库日志:${NC}"
        docker logs podcast-ai-mysql 2>/dev/null || echo "无法获取数据库日志"
        echo
    fi
fi 