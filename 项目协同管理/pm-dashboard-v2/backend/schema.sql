CREATE DATABASE IF NOT EXISTS pm_dashboard DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pm_dashboard;

CREATE TABLE IF NOT EXISTS project_info (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(255),
    intro TEXT,
    clientUnit VARCHAR(255),
    contractorUnit VARCHAR(255),
    supervisionUnit VARCHAR(255),
    contractDate VARCHAR(50),
    startDate VARCHAR(50),
    prePlanned VARCHAR(50),
    preActual VARCHAR(50),
    trialPeriod INT,
    trialStart VARCHAR(50),
    trialEnd VARCHAR(50),
    finalPlanned VARCHAR(50),
    finalActual VARCHAR(50)
);

-- Insert a default row so we can always update it safely
INSERT IGNORE INTO project_info (id, name, intro) VALUES (1, '未命名项目', '暂无项目简介说明。');

CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subsystem VARCHAR(255),
    chapter VARCHAR(255),
    strategyType VARCHAR(50),
    progress INT DEFAULT 0,
    deadline VARCHAR(50),
    tender TEXT,
    strategy TEXT,
    modifiedModules VARCHAR(255),
    link VARCHAR(255),
    status VARCHAR(50),
    displayOrder INT DEFAULT 0,
    issues JSON,
    feedbackGroups JSON,
    docs JSON,
    history JSON,
    updateTime VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS weekly_reports (
    id VARCHAR(50) PRIMARY KEY,
    weekNum INT,
    name VARCHAR(255),
    uploadTime VARCHAR(50),
    url LONGTEXT,
    fileName VARCHAR(255)
);
