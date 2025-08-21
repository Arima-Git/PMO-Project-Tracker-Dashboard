-- PMO Comments System Schema
-- Allows PMOs to add multiple timestamped comments per project

USE pmo_project_tracker;

-- PMO Comments table for tracking individual comments
CREATE TABLE IF NOT EXISTS pmo_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    added_by VARCHAR(100) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to projects table
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_project_id (project_id),
    INDEX idx_added_at (added_at),
    INDEX idx_added_by (added_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update projects table to remove the old pmo_comments column
-- (This will be done in a migration script to preserve existing data)
-- ALTER TABLE projects DROP COLUMN pmo_comments;

-- Create view for projects with latest comment info
CREATE OR REPLACE VIEW projects_with_comments AS
SELECT 
    p.*,
    (SELECT COUNT(*) FROM pmo_comments WHERE project_id = p.id) as comment_count,
    (SELECT comment_text FROM pmo_comments WHERE project_id = p.id ORDER BY added_at DESC LIMIT 1) as latest_comment,
    (SELECT added_at FROM pmo_comments WHERE project_id = p.id ORDER BY added_at DESC LIMIT 1) as latest_comment_time
FROM projects p;

-- Create view for comment history
CREATE OR REPLACE VIEW comment_history AS
SELECT 
    pc.id,
    pc.project_id,
    p.project_name,
    p.customer_name,
    pc.comment_text,
    pc.added_by,
    pc.added_at,
    DATE_FORMAT(pc.added_at, '%Y-%m-%d %H:%i') as formatted_time
FROM pmo_comments pc
JOIN projects p ON pc.project_id = p.id
ORDER BY pc.added_at DESC; 