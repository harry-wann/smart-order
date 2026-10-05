#!/bin/bash
# MySQL 容器第一次初始化（資料 volume 是空的）時會執行這個檔：
# MYSQL_DATABASE 只會建立一個資料庫（northwind），這裡補建 smartorder，並讓一般帳號也能使用它。
# 已經有資料的 volume 不會再執行；要補建請照 README 手動建立。
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS smartorder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON smartorder.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
