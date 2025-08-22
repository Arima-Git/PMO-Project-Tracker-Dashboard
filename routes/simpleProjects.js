const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const Joi = require('joi');

// Validation schema for simple project data
const simpleProjectSchema = Joi.object({
  project: Joi.string().max(255).required(),
  month: Joi.string().max(10).allow(null, ''),
  status: Joi.string().max(100).allow(null, ''),
  comments: Joi.string().allow(null, '')
});

// GET all simple projects with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      project, 
      month, 
      status, 
      limit = 1000,
      offset = 0
    } = req.query;

    let query = supabase.from('simple_projects').select('*', { count: 'exact' });

    if (project) query = query.ilike('project', `%${project}%`);
    if (month) query = query.eq('month', month);
    if (status) query = query.eq('status', status);

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
    console.error('Error fetching simple projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple projects',
      message: error.message
    });
  }
});

// GET simple project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('simple_projects').select('*').eq('id', id).single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Simple project not found' });
    }
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching simple project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple project',
      message: error.message
    });
  }
});

// POST create new simple project
router.post('/', async (req, res) => {
  try {
    const { error: validationError, value } = simpleProjectSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { data, error } = await supabase
      .from('simple_projects')
      .insert([value])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Simple project created successfully',
      data
    });
  } catch (error) {
    console.error('Error creating simple project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create simple project',
      message: error.message
    });
  }
});

// PUT update simple project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = simpleProjectSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    const { error: findErr } = await supabase.from('simple_projects').select('id').eq('id', id).single();
    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Simple project not found' });
    }

    const { data, error } = await supabase
      .from('simple_projects')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, message: 'Simple project updated successfully', data });
  } catch (error) {
    console.error('Error updating simple project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update simple project',
      message: error.message
    });
  }
});

// DELETE simple project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: findErr } = await supabase.from('simple_projects').select('id').eq('id', id).single();
    if (findErr && findErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Simple project not found' });
    }

    const { error } = await supabase.from('simple_projects').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Simple project deleted successfully' });
  } catch (error) {
    console.error('Error deleting simple project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete simple project',
      message: error.message
    });
  }
});

// GET unique values for filters
router.get('/filters/values', async (req, res) => {
  try {
    const fetchDistinct = async (column) => {
      const { data, error } = await supabase
        .from('simple_projects')
        .select(column)
        .not(column, 'is', null)
        .neq(column, '')
        .order(column);
      if (error) throw error;
      const set = new Set((data || []).map(row => row[column]));
      return Array.from(set);
    };

    const [statuses, months] = await Promise.all([
      fetchDistinct('status'),
      fetchDistinct('month')
    ]);

    res.json({
      success: true,
      data: { statuses, months }
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