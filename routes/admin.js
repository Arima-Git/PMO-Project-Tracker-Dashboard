const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const Joi = require('joi');

// Validation schemas
const dropdownOptionSchema = Joi.object({
  type: Joi.string().valid('account_managers', 'statuses', 'priorities', 'phases', 'end_months').required(),
  value: Joi.string().max(255).required(),
  description: Joi.string().max(500).allow('', null)
});

const userSchema = Joi.object({
  username: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'manager', 'viewer').required()
});

// Middleware to log admin actions
async function logAdminAction(req, action, details) {
  try {
    await supabase.from('admin_activity_log').insert([{
      action,
      details,
      user_id: req.user?.id || 'system',
      ip_address: req.ip || 'unknown'
    }]);
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

// GET all dropdown options
router.get('/dropdown-options', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('*')
      .order('type', { ascending: true })
      .order('value', { ascending: true });
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dropdown options',
      message: error.message
    });
  }
});

// POST create new dropdown option
router.post('/dropdown-options', async (req, res) => {
  try {
    const { error: validationError, value } = dropdownOptionSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationError.details });
    }

    // Check if option already exists
    const { data: existing, error: existErr } = await supabase
      .from('dropdown_options')
      .select('id')
      .eq('type', value.type)
      .eq('value', value.value);
    if (existErr) throw existErr;
    if ((existing || []).length > 0) {
      return res.status(400).json({ success: false, error: 'Option already exists' });
    }

    const { data, error } = await supabase
      .from('dropdown_options')
      .insert([{ type: value.type, value: value.value, description: value.description || null }])
      .select('id')
      .single();
    if (error) throw error;

    await logAdminAction(req, 'CREATE_DROPDOWN_OPTION', `Added ${value.type}: ${value.value}`);

    res.status(201).json({ success: true, message: 'Dropdown option created successfully', data: { id: data.id, ...value } });
  } catch (error) {
    console.error('Error creating dropdown option:', error);
    res.status(500).json({ success: false, error: 'Failed to create dropdown option', message: error.message });
  }
});

// PUT update dropdown option
router.put('/dropdown-options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = dropdownOptionSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationError.details });
    }

    // Check if option exists
    const { error: existErr } = await supabase.from('dropdown_options').select('*').eq('id', id).single();
    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Dropdown option not found' });
    }
    if (existErr) throw existErr;

    // Check for duplicate values (excluding current option)
    const { data: duplicate, error: dupErr } = await supabase
      .from('dropdown_options')
      .select('id')
      .eq('type', value.type)
      .eq('value', value.value)
      .neq('id', id);
    if (dupErr) throw dupErr;
    if ((duplicate || []).length > 0) {
      return res.status(400).json({ success: false, error: 'Option value already exists for this type' });
    }

    const { error } = await supabase
      .from('dropdown_options')
      .update({ type: value.type, value: value.value, description: value.description || null })
      .eq('id', id);
    if (error) throw error;

    await logAdminAction(req, 'UPDATE_DROPDOWN_OPTION', `Updated ${value.type}: ${value.value}`);

    res.json({ success: true, message: 'Dropdown option updated successfully' });
  } catch (error) {
    console.error('Error updating dropdown option:', error);
    res.status(500).json({ success: false, error: 'Failed to update dropdown option', message: error.message });
  }
});

// DELETE dropdown option
router.delete('/dropdown-options/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if option exists
    const { data: existing, error: existErr } = await supabase.from('dropdown_options').select('*').eq('id', id).single();
    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Dropdown option not found' });
    }
    if (existErr) throw existErr;

    // Check if option is being used in projects
    const value = existing.value;
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .or(
        `account_manager.eq.${value},status.eq.${value},priority.eq.${value},current_phase.eq.${value},end_month.eq.${value}`
      );

    if ((count || 0) > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete option that is currently in use by projects' });
    }

    const { error } = await supabase.from('dropdown_options').delete().eq('id', id);
    if (error) throw error;

    await logAdminAction(req, 'DELETE_DROPDOWN_OPTION', `Deleted ${existing.type}: ${existing.value}`);

    res.json({ success: true, message: 'Dropdown option deleted successfully' });
  } catch (error) {
    console.error('Error deleting dropdown option:', error);
    res.status(500).json({ success: false, error: 'Failed to delete dropdown option', message: error.message });
  }
});

// GET all users
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users', message: error.message });
  }
});

// POST create new user
router.post('/users', async (req, res) => {
  try {
    const { error: validationError, value } = userSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationError.details });
    }

    // Check duplicates
    const { data: existing, error: dupErr } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${value.username},email.eq.${value.email}`);
    if (dupErr) throw dupErr;
    if ((existing || []).length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const hashedPassword = value.password; // Placeholder for password hashing

    const { data, error } = await supabase
      .from('users')
      .insert([{ username: value.username, email: value.email, password_hash: hashedPassword, role: value.role }])
      .select('id')
      .single();
    if (error) throw error;

    await logAdminAction(req, 'CREATE_USER', `Created user: ${value.username}`);

    res.status(201).json({ success: true, message: 'User created successfully', data: { id: data.id, username: value.username, email: value.email, role: value.role } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user', message: error.message });
  }
});

// PUT update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = userSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationError.details });
    }

    // Check if user exists
    const { error: existErr } = await supabase.from('users').select('*').eq('id', id).single();
    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (existErr) throw existErr;

    // Check duplicates (excluding this id)
    const { data: duplicate, error: dupErr } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${value.username},email.eq.${value.email}`)
      .neq('id', id);
    if (dupErr) throw dupErr;
    if ((duplicate || []).length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const hashedPassword = value.password; // Placeholder

    const { error } = await supabase
      .from('users')
      .update({ username: value.username, email: value.email, password_hash: hashedPassword, role: value.role })
      .eq('id', id);
    if (error) throw error;

    await logAdminAction(req, 'UPDATE_USER', `Updated user: ${value.username}`);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user', message: error.message });
  }
});

// PUT toggle user status
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: existErr } = await supabase.from('users').select('*').eq('id', id).single();
    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (existErr) throw existErr;

    const newStatus = !existing.is_active;

    const { error } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', id);
    if (error) throw error;

    await logAdminAction(req, 'TOGGLE_USER_STATUS', `${newStatus ? 'Activated' : 'Deactivated'} user: ${existing.username}`);

    res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle user status', message: error.message });
  }
});

// GET activity log
router.get('/activity-log', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const from = parseInt(offset);
    const to = from + parseInt(limit) - 1;

    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('timestamp', { descending: true })
      .range(from, to);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity log', message: error.message });
  }
});

// GET system settings
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .order('setting_key', { ascending: true });
    if (error) throw error;

    const settingsObj = {};
    (data || []).forEach((setting) => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system settings', message: error.message });
  }
});

// PUT update system settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body || {};
    const updates = Object.entries(settings).map(([key, value]) => ({ setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() }));

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No settings provided' });
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert(updates, { onConflict: 'setting_key' });
    if (error) throw error;

    await logAdminAction(req, 'UPDATE_SETTINGS', `Updated system settings: ${Object.keys(settings).join(', ')}`);

    res.json({ success: true, message: 'System settings updated successfully' });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update system settings', message: error.message });
  }
});

module.exports = router; 