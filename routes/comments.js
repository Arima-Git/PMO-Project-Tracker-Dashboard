const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const Joi = require('joi');

// Validation schema for comments
const commentSchema = Joi.object({
  comment_text: Joi.string().min(1).max(1000).required(),
  added_by: Joi.string().min(1).max(100).required()
});

function formatTime(ts) {
  try {
    return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return ts;
  }
}

// GET all comments for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('pmo_comments')
      .select('id, project_id, comment_text, added_by, added_at, projects:projects!pmo_comments_project_id_fkey(project_name, customer_name)')
      .eq('project_id', projectId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    const comments = (data || []).map((c) => ({
      ...c,
      formatted_time: formatTime(c.added_at),
      project_name: c.projects?.project_name,
      customer_name: c.projects?.customer_name
    }));

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      message: error.message
    });
  }
});

// GET comment history (all comments across all projects)
router.get('/history', async (req, res) => {
  try {
    const { limit = 100, offset = 0, project_id } = req.query;

    let query = supabase
      .from('pmo_comments')
      .select('id, project_id, comment_text, added_by, added_at, projects:projects!pmo_comments_project_id_fkey(project_name, customer_name)');

    if (project_id) query = query.eq('project_id', project_id);

    const from = parseInt(offset);
    const to = from + parseInt(limit) - 1;

    const { data, error } = await query
      .order('added_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const comments = (data || []).map((c) => ({
      ...c,
      formatted_time: formatTime(c.added_at),
      project_name: c.projects?.project_name,
      customer_name: c.projects?.customer_name
    }));

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error fetching comment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comment history',
      message: error.message
    });
  }
});

// POST add new comment to a project
router.post('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { error: validationError, value } = commentSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    // Check if project exists
    const { error: projectErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectErr && projectErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (projectErr) throw projectErr;

    // Insert new comment
    const { data: inserted, error: insertErr } = await supabase
      .from('pmo_comments')
      .insert([{ project_id: Number(projectId), comment_text: value.comment_text, added_by: value.added_by }])
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Get the newly created comment with project info
    const { data: newComment, error: selectErr } = await supabase
      .from('pmo_comments')
      .select('id, project_id, comment_text, added_by, added_at, projects:projects!pmo_comments_project_id_fkey(project_name, customer_name)')
      .eq('id', inserted.id)
      .single();

    if (selectErr) throw selectErr;

    const response = {
      ...newComment,
      formatted_time: formatTime(newComment.added_at),
      project_name: newComment.projects?.project_name,
      customer_name: newComment.projects?.customer_name
    };

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: response
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      message: error.message
    });
  }
});

// PUT update an existing comment
router.put('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { error: validationError, value } = commentSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details
      });
    }

    // Check if comment exists
    const { data: existing, error: existErr } = await supabase
      .from('pmo_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    if (existErr) throw existErr;

    // Update comment
    const { error: updateErr } = await supabase
      .from('pmo_comments')
      .update({ comment_text: value.comment_text, added_by: value.added_by })
      .eq('id', commentId);

    if (updateErr) throw updateErr;

    // Get updated comment
    const { data: updated, error: selErr } = await supabase
      .from('pmo_comments')
      .select('id, project_id, comment_text, added_by, added_at, projects:projects!pmo_comments_project_id_fkey(project_name, customer_name)')
      .eq('id', commentId)
      .single();

    if (selErr) throw selErr;

    const response = {
      ...updated,
      formatted_time: formatTime(updated.added_at),
      project_name: updated.projects?.project_name,
      customer_name: updated.projects?.customer_name
    };

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: response
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment',
      message: error.message
    });
  }
});

// DELETE a comment
router.delete('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    // Check if comment exists
    const { error: existErr } = await supabase
      .from('pmo_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (existErr && existErr.code === 'PGRST116') {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Delete comment
    const { error } = await supabase.from('pmo_comments').delete().eq('id', commentId);
    if (error) throw error;

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
      message: error.message
    });
  }
});

// GET comment statistics
router.get('/stats', async (req, res) => {
  try {
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const totalReq = supabase.from('pmo_comments').select('id', { count: 'exact', head: true });
    const projReq = supabase.from('pmo_comments').select('project_id', { count: 'exact', head: true });
    const recentReq = supabase.from('pmo_comments').select('id', { count: 'exact', head: true }).gte('added_at', sevenDaysAgoIso);

    const [{ count: total_comments }, { count: projects_with_comments }, { count: recent_comments }] = await Promise.all([
      totalReq, projReq, recentReq
    ]);

    res.json({
      success: true,
      data: {
        total_comments: total_comments || 0,
        projects_with_comments: projects_with_comments || 0,
        recent_comments: recent_comments || 0
      }
    });
  } catch (error) {
    console.error('Error fetching comment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comment statistics',
      message: error.message
    });
  }
});

module.exports = router; 