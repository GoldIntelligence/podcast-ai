#!/bin/bash

echo "=> 检查数据库连接..."
RETRY_COUNT=0
MAX_RETRIES=30

until mysql -h localhost -u root -p123456 -e "SELECT 1" &>/dev/null
do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "=> 无法连接到数据库，已达到最大重试次数 $MAX_RETRIES"
    exit 1
  fi
  
  echo "=> 数据库尚未就绪，等待... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "=> 数据库连接成功！"
echo "=> 检查数据库表..."

TABLES=$(mysql -h localhost -u root -p123456 -e "USE podcast_db; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in")
TABLE_COUNT=$(echo "$TABLES" | wc -l)

echo "=> 发现 $TABLE_COUNT 个表:"
echo "$TABLES"

echo "=> 数据库初始化完成！" 