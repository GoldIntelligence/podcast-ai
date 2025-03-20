-- MySQL 8.0 版本的权限语法不同
CREATE USER IF NOT EXISTS 'podcast_user'@'%' IDENTIFIED BY 'podcast_pass';
GRANT ALL PRIVILEGES ON podcast_db.* TO 'podcast_user'@'%';
GRANT ALL PRIVILEGES ON podcast_db.* TO 'root'@'%';
FLUSH PRIVILEGES; 

-- 创建数据库表结构
CREATE DATABASE IF NOT EXISTS podcast_db;
USE podcast_db;

-- 对话表
CREATE TABLE IF NOT EXISTS `dialogues` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `speakers` json NOT NULL,
  `content` json NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 声音模型表
CREATE TABLE IF NOT EXISTS `voices` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('system', 'cloned') NOT NULL DEFAULT 'system',
  `description` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文档表
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `type` varchar(50) NOT NULL,
  `content` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TTS任务表
CREATE TABLE IF NOT EXISTS `tts_tasks` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
  `progress` int(10) unsigned NOT NULL DEFAULT 0,
  `audioUrl` varchar(255) DEFAULT NULL,
  `duration` int(10) unsigned DEFAULT NULL,
  `dialogueId` int(10) unsigned DEFAULT NULL,
  `voiceId` varchar(50) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dialogueId` (`dialogueId`),
  KEY `voiceId` (`voiceId`),
  CONSTRAINT `tts_tasks_ibfk_1` FOREIGN KEY (`dialogueId`) REFERENCES `dialogues` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tts_tasks_ibfk_2` FOREIGN KEY (`voiceId`) REFERENCES `voices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加一些默认的系统声音
INSERT INTO `voices` (`id`, `name`, `type`, `description`, `createdAt`, `updatedAt`) 
VALUES
('male_voice_1', '男声1', 'system', '标准男声', NOW(), NOW()),
('female_voice_1', '女声1', 'system', '标准女声', NOW(), NOW()),
('narrator_voice', '旁白声', 'system', '中性旁白声音', NOW(), NOW());
