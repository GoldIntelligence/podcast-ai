#!/bin/sh
# wait-for-mysql.sh

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

echo "等待MySQL数据库连接 $host:$port..."

# 等待MySQL服务准备好
for i in $(seq 1 30); do
  if nc -z "$host" "$port"; then
    echo "MySQL数据库已准备好!"
    break
  fi
  echo "等待MySQL数据库准备... $i/30"
  sleep 2
done

# 再等待10秒，确保数据库初始化完成
echo "等待额外10秒让数据库完全初始化..."
sleep 10

# 执行传入的命令
echo "开始执行: $cmd"
exec $cmd 