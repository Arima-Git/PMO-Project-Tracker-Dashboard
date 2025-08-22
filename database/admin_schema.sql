-- Admin Panel Database Schema
-- Additional tables for PMO Dashboard Admin functionality

USE pmo_project_tracker;

-- Dropdown options table for managing all dropdown values
CREATE TABLE IF NOT EXISTS dropdown_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('account_managers', 'statuses', 'priorities', 'phases', 'end_months') NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_type (type),
    INDEX idx_value (value),
    INDEX idx_active (is_active),
    
    -- Unique constraint to prevent duplicate values for same type
    UNIQUE KEY unique_type_value (type, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin activity log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings table for configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default dropdown options
INSERT INTO dropdown_options (type, value, description) VALUES
-- Account Managers
('account_managers', 'Saad B. Ameer', 'Senior Account Manager'),
('account_managers', 'Rida Ashfaq', 'Account Manager'),
('account_managers', 'NadeAli Naqvi', 'Account Manager'),
('account_managers', 'Moiz Raza', 'Account Manager'),
('account_managers', 'Huzaifa Saif', 'Account Manager'),
('account_managers', 'Abbas Naqvi', 'Account Manager'),
('account_managers', 'Muhammad Kumail', 'Account Manager'),
('account_managers', 'Ali Asghar', 'Account Manager'),
('account_managers', 'Abeeha Muhammad', 'Account Manager'),

-- Statuses
('statuses', 'Active', 'Project is currently active'),
('statuses', 'Inactive', 'Project is not active'),
('statuses', 'Hold', 'Project is on hold'),
('statuses', 'Completed', 'Project has been completed'),

-- Priorities
('priorities', 'High', 'High priority project'),
('priorities', 'Medium', 'Medium priority project'),
('priorities', 'Low', 'Low priority project'),

-- Project Phases
('phases', 'In Development', 'Project is in development phase'),
('phases', 'In Design', 'Project is in design phase'),
('phases', 'In Deployment', 'Project is being deployed'),
('phases', 'Beta', 'Project is in beta testing'),
('phases', 'UAT', 'Project is in user acceptance testing'),
('phases', 'LIVE', 'Project is live and operational'),
('phases', 'Maintenance', 'Project is in maintenance mode'),
('phases', 'Done', 'Project is completed'),

-- End Months
('end_months', 'Jul\'25', 'July 2025'),
('end_months', 'Aug\'25', 'August 2025'),
('end_months', 'Sep\'25', 'September 2025'),
('end_months', 'Oct\'25', 'October 2025'),
('end_months', 'Nov\'25', 'November 2025'),
('end_months', 'Dec\'25', 'December 2025'),
('end_months', 'Jan\'26', 'January 2026'),
('end_months', 'Feb\'26', 'February 2026'),
('end_months', 'Mar\'26', 'March 2026'),
('end_months', 'Apr\'26', 'April 2026'),
('end_months', 'May\'26', 'May 2026'),
('end_months', 'Jun\'26', 'June 2026'),
('end_months', 'Done', 'Project completed')
ON DUPLICATE KEY UPDATE value = value;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_projects_per_page', '100', 'Maximum number of projects to display per page'),
('auto_refresh_interval', '60', 'Auto refresh interval in seconds'),
('enable_notifications', 'true', 'Enable system notifications'),
('log_retention_days', '30', 'Number of days to retain activity logs'),
('dashboard_theme', 'light', 'Default dashboard theme'),
('timezone', 'UTC', 'System timezone')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Create view for dropdown options summary
CREATE OR REPLACE VIEW dropdown_summary AS
SELECT 
    type,
    COUNT(*) as total_options,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_options,
    COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_options
FROM dropdown_options 
GROUP BY type
ORDER BY type;

-- Create view for recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
    action,
    details,
    user_id,
    ip_address,
    timestamp,
    DATE(timestamp) as activity_date
FROM admin_activity_log 
ORDER BY timestamp DESC
LIMIT 100; 