-- Sample data for PMO Project Tracker Dashboard
-- Run this in Supabase SQL Editor to populate with test data

-- Insert sample projects
INSERT INTO public.projects (customer_name, project_name, account_manager, status, current_phase, priority, end_month, status2, pmo_comments) VALUES
('Acme Corp', 'Website Redesign', 'John Smith', 'Active', 'Planning', 'High', 'March 2024', 'In Development', 'Initial planning phase completed'),
('TechStart Inc', 'Mobile App Development', 'Sarah Johnson', 'Active', 'Development', 'High', 'April 2024', 'In Development', 'Core features in progress'),
('Global Solutions', 'Database Migration', 'Mike Wilson', 'Hold', 'Analysis', 'Medium', 'May 2024', 'Planning', 'Waiting for client approval'),
('Innovation Labs', 'AI Integration', 'Lisa Brown', 'Active', 'Testing', 'Low', 'June 2024', 'Testing', 'Final testing phase'),
('DataFlow Systems', 'Cloud Migration', 'David Lee', 'Inactive', 'Completed', 'Medium', 'February 2024', 'Done', 'Successfully completed'),
('Future Tech', 'IoT Platform', 'Emma Davis', 'Active', 'Design', 'High', 'July 2024', 'In Development', 'Design phase in progress'),
('Smart Solutions', 'Security Audit', 'Tom Anderson', 'Active', 'Planning', 'High', 'March 2024', 'Planning', 'Security requirements gathering'),
('Digital Dynamics', 'E-commerce Platform', 'Rachel Green', 'Hold', 'Development', 'Medium', 'August 2024', 'In Development', 'On hold due to budget constraints'),
('NextGen Systems', 'API Development', 'Chris Martin', 'Active', 'Testing', 'Low', 'September 2024', 'Testing', 'API testing in progress'),
('CloudTech Inc', 'Server Migration', 'Amanda White', 'Active', 'Planning', 'Medium', 'October 2024', 'Planning', 'Planning phase initiated');

-- Insert sample dropdown options (optional - for admin panel)
INSERT INTO public.dropdown_options (type, value, description, is_active) VALUES
('statuses', 'Active', 'Project is currently active and progressing', true),
('statuses', 'Inactive', 'Project is not currently active', true),
('statuses', 'Hold', 'Project is on hold temporarily', true),
('statuses', 'Completed', 'Project has been completed', true),
('priorities', 'High', 'High priority project', true),
('priorities', 'Medium', 'Medium priority project', true),
('priorities', 'Low', 'Low priority project', true),
('phases', 'Planning', 'Project planning phase', true),
('phases', 'Analysis', 'Requirements analysis phase', true),
('phases', 'Design', 'Design phase', true),
('phases', 'Development', 'Development phase', true),
('phases', 'Testing', 'Testing phase', true),
('phases', 'Completed', 'Project completed', true),
('end_months', 'January 2024', 'January 2024', true),
('end_months', 'February 2024', 'February 2024', true),
('end_months', 'March 2024', 'March 2024', true),
('end_months', 'April 2024', 'April 2024', true),
('end_months', 'May 2024', 'May 2024', true),
('end_months', 'June 2024', 'June 2024', true),
('end_months', 'July 2024', 'July 2024', true),
('end_months', 'August 2024', 'August 2024', true),
('end_months', 'September 2024', 'September 2024', true),
('end_months', 'October 2024', 'October 2024', true),
('account_managers', 'John Smith', 'Senior Account Manager', true),
('account_managers', 'Sarah Johnson', 'Account Manager', true),
('account_managers', 'Mike Wilson', 'Senior Account Manager', true),
('account_managers', 'Lisa Brown', 'Account Manager', true),
('account_managers', 'David Lee', 'Senior Account Manager', true),
('account_managers', 'Emma Davis', 'Account Manager', true),
('account_managers', 'Tom Anderson', 'Senior Account Manager', true),
('account_managers', 'Rachel Green', 'Account Manager', true),
('account_managers', 'Chris Martin', 'Senior Account Manager', true),
('account_managers', 'Amanda White', 'Account Manager', true);

-- Insert sample users (for admin panel)
INSERT INTO public.users (username, email, password_hash, role, is_active) VALUES
('admin', 'admin@pmo.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'admin', true),
('manager1', 'manager1@pmo.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'manager', true),
('viewer1', 'viewer1@pmo.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'viewer', true),
('johnsmith', 'john.smith@company.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'manager', true),
('sarahjohnson', 'sarah.johnson@company.com', '$2b$10$rQZ8K9vX8mN7pQ2sT5uV6w', 'viewer', true);

-- Insert sample comments
INSERT INTO public.pmo_comments (project_id, comment_text, added_by) VALUES
(1, 'Project kickoff meeting scheduled for next week', 'PMO Team'),
(1, 'Stakeholder requirements gathered successfully', 'John Smith'),
(2, 'Development team assigned and briefed', 'Sarah Johnson'),
(3, 'Client requested additional time for review', 'Mike Wilson'),
(4, 'Testing phase initiated with QA team', 'Lisa Brown'),
(5, 'Project completed and handed over to client', 'David Lee'),
(6, 'Design phase completed, ready for development', 'Emma Davis'),
(7, 'Security requirements documented and approved', 'Tom Anderson'),
(8, 'Development paused due to budget review', 'Rachel Green'),
(9, 'API testing completed successfully', 'Chris Martin'),
(10, 'Migration plan approved by stakeholders', 'Amanda White'); 