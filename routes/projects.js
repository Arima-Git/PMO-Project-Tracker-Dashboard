const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const Joi = require('joi');

// Validation schema for project data
const projectSchema = Joi.object({
  customer_name: Joi.string().max(255).allow(null, ''),
  project_name: Joi.string().max(255).required(),
  account_manager: Joi.string().max(255).allow(null, ''),
  status: Joi.string().max(100).allow(null, ''),
  current_phase: Joi.string().max(255).allow(null, ''),
  priority: Joi.string().max(50).allow(null, ''),
  end_month: Joi.string().max(50).allow(null, ''),
  status2: Joi.string().max(100).allow(null, ''),
  pmo_comments: Joi.string().allow(null, '')
});

// GET all projects with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      customer_name, 
      project_name, 
      account_manager, 
      status, 
      status2, 
      priority, 
      end_month,
      limit = 1000,
      offset = 0
    } = req.query;

    let query = supabase.from('projects').select('*', { count: 'exact' });

    if (customer_name) query = query.ilike('customer_name', `%${customer_name}%`);
    if (project_name) query = query.ilike('project_name', `%${project_name}%`);
    if (account_manager) query = query.ilike('account_manager', `%${account_manager}%`);
    if (status) query = query.eq('status', status);
    if (status2) query = query.eq('status2', status2);
    if (priority) query = query.eq('priority', priority);
    if (end_month) query = query.eq('end_month', end_month);

    const from = parseInt(offset);
    const to = from + parseInt(limit) - 1;

    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(from, to);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (from + (data?.length || 0)) < (count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// GET project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      message: error.message
    });
  }
});

// POST create new project
router.post('/', async (req, res) => {
  try {
    const { error: validationError, value } = projectSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([value])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message
    });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = projectSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    // Ensure exists
    const { data: existing, error: findErr } = await supabase.from('projects').select('id').eq('id', id).single();
    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (findErr) throw findErr;

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Project updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure exists
    const { error: findErr } = await supabase.from('projects').select('id').eq('id', id).single();
    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// GET unique values for filters
router.get('/filters/values', async (req, res) => {
  try {
    const fetchDistinct = async (column) => {
      const { data, error } = await supabase
        .from('projects')
        .select(column)
        .not(column, 'is', null)
        .neq(column, '')
        .order(column);
      if (error) throw error;
      const set = new Set((data || []).map(row => row[column]));
      return Array.from(set);
    };

    const [statuses, status2s, priorities, endMonths, accountManagers] = await Promise.all([
      fetchDistinct('status'),
      fetchDistinct('status2'),
      fetchDistinct('priority'),
      fetchDistinct('end_month'),
      fetchDistinct('account_manager')
    ]);

    res.json({
      success: true,
      data: {
        statuses,
        status2s,
        priorities,
        endMonths,
        accountManagers
      }
    });
  } catch (error) {
    console.error('Error fetching filter values:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter values',
      message: error.message
    });
  }
});

module.exports = router; 