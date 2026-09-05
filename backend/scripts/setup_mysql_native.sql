-- Run as a MySQL/MariaDB admin (example: mysql -u root -p < scripts/setup_mysql_native.sql)
-- Creates the app user and database expected by backend/.env.example

CREATE DATABASE IF NOT EXISTS trella CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'trella'@'localhost' IDENTIFIED BY 'trella';
CREATE USER IF NOT EXISTS 'trella'@'127.0.0.1' IDENTIFIED BY 'trella';

GRANT ALL PRIVILEGES ON trella.* TO 'trella'@'localhost';
GRANT ALL PRIVILEGES ON trella.* TO 'trella'@'127.0.0.1';

FLUSH PRIVILEGES;
