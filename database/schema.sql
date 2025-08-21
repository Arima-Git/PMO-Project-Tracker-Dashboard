-- PMO Project Tracker Database Schema
-- MySQL 8.0 compatible

-- Create database
CREATE DATABASE IF NOT EXISTS pmo_project_tracker
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE pmo_project_tracker;

-- Projects table (for complex data from RowData_Dashboard_Light.html)
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255),
    project_name VARCHAR(255) NOT NULL,
    account_manager VARCHAR(255),
    status VARCHAR(100),
    current_phase VARCHAR(255),
    priority VARCHAR(50),
    end_month VARCHAR(50),
    status2 VARCHAR(100),
    pmo_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_project_name (project_name),
    INDEX idx_status (status),
    INDEX idx_status2 (status2),
    INDEX idx_end_month (end_month),
    INDEX idx_account_manager (account_manager),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Simple projects table (for basic data from RowData_Dashboard_Combined.html)
CREATE TABLE IF NOT EXISTS simple_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project VARCHAR(255) NOT NULL,
    month VARCHAR(10),
    status VARCHAR(100),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_project (project),
    INDEX idx_status (status),
    INDEX idx_month (month),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project history table for tracking changes
CREATE TABLE IF NOT EXISTS project_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    table_name ENUM('projects', 'simple_projects') NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_project_id (project_id),
    INDEX idx_table_name (table_name),
    INDEX idx_changed_at (changed_at),
    
    -- Foreign key constraints
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table for future authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create views for easier data access
CREATE OR REPLACE VIEW project_summary AS
SELECT 
    COUNT(*) as total_projects,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_projects,
    COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_projects,
    COUNT(CASE WHEN status = 'Hold' THEN 1 END) as hold_projects,
    COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority_projects,
    COUNT(CASE WHEN status2 = 'In Development' THEN 1 END) as in_development_projects,
    COUNT(CASE WHEN status2 = 'Done' THEN 1 END) as completed_projects
FROM projects;

-- Create view for monthly project distribution
CREATE OR REPLACE VIEW monthly_distribution AS
SELECT 
    end_month,
    COUNT(*) as project_count,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count,
    COUNT(CASE WHEN status2 = 'In Development' THEN 1 END) as development_count
FROM projects 
WHERE end_month IS NOT NULL AND end_month != ''
GROUP BY end_month
ORDER BY end_month;

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@pmo.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'admin')
ON DUPLICATE KEY UPDATE username = username; 