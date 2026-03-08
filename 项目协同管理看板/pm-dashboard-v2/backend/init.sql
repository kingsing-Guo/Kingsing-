-- 创建数据库
CREATE DATABASE IF NOT EXISTS pm_dashboard DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pm_dashboard;

-- 1. 项目基本信息表
CREATE TABLE IF NOT EXISTS project_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) DEFAULT '未命名项目',
    clientUnit VARCHAR(255),
    contractorUnit VARCHAR(255),
    supervisionUnit VARCHAR(255),
    intro TEXT,
    contractDate VARCHAR(20),
    startDate VARCHAR(20),
    trialPeriod INT DEFAULT 3,
    trialStart VARCHAR(20),
    trialEnd VARCHAR(20),
    prePlanned VARCHAR(20),
    preActual VARCHAR(20),
    finalPlanned VARCHAR(20),
    finalActual VARCHAR(20),
    strategies JSON, -- 存储响应策略字典
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初始化一条数据
INSERT INTO project_info (id, name) VALUES (1, '未命名项目') ON DUPLICATE KEY UPDATE name=name;

-- 2. 功能模块表
CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subsystem VARCHAR(100),
    chapter VARCHAR(100),
    strategyType VARCHAR(50),
    progress INT DEFAULT 0,
    deadline VARCHAR(20),
    tender TEXT,
    strategy TEXT,
    modifiedModules TEXT,
    link TEXT,
    status VARCHAR(20) DEFAULT '进行中',
    displayOrder INT DEFAULT 0,
    issues JSON, -- 存储协调事项列表
    feedbackGroups JSON, -- 存储反馈建议列表
    docs JSON, -- 存储文档列表
    history JSON, -- 存储操作历史
    functionalStructure JSON, -- 存储架构图同步过来的结构数据
    updateTime VARCHAR(50)
);

-- 3. 项目周报表
CREATE TABLE IF NOT EXISTS weekly_reports (
    id VARCHAR(50) PRIMARY KEY,
    weekNum INT,
    name VARCHAR(255),
    uploadTime VARCHAR(50),
    url MEDIUMTEXT, -- 考虑到Base64文件，使用MEDIUMTEXT
    fileName VARCHAR(255)
);

-- 4. 架构图缓存表 (全局架构树)
CREATE TABLE IF NOT EXISTS parsed_tree (
    id INT PRIMARY KEY DEFAULT 1,
    treeData JSON,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO parsed_tree (id, treeData) VALUES (1, NULL) ON DUPLICATE KEY UPDATE id=id;

-- 5. 系统用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    realName VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'partyA',
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化系统默认账号
INSERT IGNORE INTO users (id, username, password, realName, role) VALUES 
(1, 'admin', '123456', '系统管理员', 'team'),
(2, 'jiafang', '123456', '甲方负责人', 'partyA');
