#!/bin/bash
# MySQL 容器第一次初始化（資料 volume 是空的）時會執行這個檔：
# 建立 smartorder 與 northwind 兩個資料庫，並讓一般帳號（MYSQL_USER）能使用它們。
# 已經有資料的 volume 不會再執行；要補建請照 README 手動建立。
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS smartorder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS northwind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON smartorder.* TO '$MYSQL_USER'@'%';
GRANT ALL PRIVILEGES ON northwind.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
