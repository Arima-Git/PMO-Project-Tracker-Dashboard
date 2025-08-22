const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Helpers
function countBy(array, key) {
  const map = new Map();
  array.forEach((row) => {
    const value = row[key];
    if (!value) return;
    map.set(value, (map.get(value) || 0) + 1);
  });
  return Array.from(map.entries()).map(([k, v]) => ({ [key]: k, count: v }));
}

// GET project summary statistics
router.get('/summary', async (req, res) => {
  try {
    const totalReq = supabase.from('projects').select('id', { count: 'exact', head: true });
    const activeReq = supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'Active');
    const inDevReq = supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status2', 'In Development');
    const completedReq = supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status2', 'Done');
    const highPriorityReq = supabase.from('projects').select('id', { count: 'exact', head: true }).eq('priority', 'High');

    const [totalRes, activeRes, inDevRes, completedRes, highPriorityRes] = await Promise.all([
      totalReq, activeReq, inDevReq, completedReq, highPriorityReq
    ]);

    const thisMonthKey = (() => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const d = new Date();
      return `${months[d.getMonth()]}\'${String(d.getFullYear()).slice(-2)}`;
    })();
    const { count: thisMonthProjects } = await supabase
      .from('projects').select('id', { count: 'exact', head: true })
      .eq('end_month', thisMonthKey);

    const { data: lastUpdatedRows } = await supabase
      .from('projects').select('updated_at')
      .order('updated_at', { descending: true })
      .limit(1);

    res.json({
      success: true,
      data: {
        totalProjects: totalRes.count || 0,
        activeProjects: activeRes.count || 0,
        delayedProjects: inDevRes.count || 0,
        completedProjects: completedRes.count || 0,
        highPriorityProjects: highPriorityRes.count || 0,
        thisMonthProjects: thisMonthProjects || 0,
        lastUpdated: lastUpdatedRows && lastUpdatedRows[0] ? lastUpdatedRows[0].updated_at : null,
        summary: {
          total_projects: totalRes.count || 0,
          active_projects: activeRes.count || 0,
          high_priority_projects: highPriorityRes.count || 0,
          in_development_projects: inDevRes.count || 0,
          completed_projects: completedRes.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project summary',
      message: error.message
    });
  }
});

// GET monthly project distribution
router.get('/monthly-distribution', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('end_month, status, status2');
    if (error) throw error;

    const map = new Map();
    (data || []).forEach((p) => {
      const key = p.end_month || '';
      const entry = map.get(key) || { end_month: key, project_count: 0, active_count: 0, development_count: 0 };
      entry.project_count += 1;
      if (p.status === 'Active') entry.active_count += 1;
      if (p.status2 === 'In Development') entry.development_count += 1;
      map.set(key, entry);
    });

    const distribution = Array.from(map.values()).sort((a, b) => String(a.end_month).localeCompare(String(b.end_month)));

    res.json({ success: true, data: distribution });
  } catch (error) {
    console.error('Error fetching monthly distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly distribution',
      message: error.message
    });
  }
});

// GET status distribution
router.get('/status-distribution', async (req, res) => {
  try {
    const totalReq = supabase.from('projects').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase.from('projects').select('status, status2');
    if (error) throw error;
    const totalRes = await totalReq;
    const total = totalRes.count || 0;

    const statusCounts = countBy(data || [], 'status').map((r) => ({
      status: r.status,
      count: r.count,
      percentage: total ? Math.round((r.count * 1000) / total) / 10 : 0
    }));
    const status2Counts = countBy(data || [], 'status2').map((r) => ({
      status2: r.status2,
      count: r.count,
      percentage: total ? Math.round((r.count * 1000) / total) / 10 : 0
    }));

    res.json({ success: true, data: { status: statusCounts, status2: status2Counts } });
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status distribution',
      message: error.message
    });
  }
});

// GET recent activity (last 10 updated projects)
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, customer_name, status, status2, updated_at, pmo_comments')
      .order('updated_at', { descending: true })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity',
      message: error.message
    });
  }
});

// GET account manager statistics
router.get('/account-managers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('account_manager, status, priority, status2');
    if (error) throw error;

    const map = new Map();
    (data || []).forEach((p) => {
      const key = p.account_manager;
      if (!key) return;
      const entry = map.get(key) || { account_manager: key, total_projects: 0, active_projects: 0, high_priority_projects: 0, in_development_projects: 0 };
      entry.total_projects += 1;
      if (p.status === 'Active') entry.active_projects += 1;
      if (p.priority === 'High') entry.high_priority_projects += 1;
      if (p.status2 === 'In Development') entry.in_development_projects += 1;
      map.set(key, entry);
    });

    const managerStats = Array.from(map.values()).sort((a, b) => b.total_projects - a.total_projects);

    res.json({ success: true, data: managerStats });
  } catch (error) {
    console.error('Error fetching account manager statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account manager statistics',
      message: error.message
    });
  }
});

// GET priority distribution
router.get('/priority-distribution', async (req, res) => {
  try {
    const totalReq = supabase.from('projects').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase.from('projects').select('priority');
    if (error) throw error;
    const totalRes = await totalReq;
    const total = totalRes.count || 0;

    const priorityStats = countBy(data || [], 'priority').map((r) => ({
      priority: r.priority,
      count: r.count,
      percentage: total ? Math.round((r.count * 1000) / total) / 10 : 0
    }));

    res.json({ success: true, data: priorityStats });
  } catch (error) {
    console.error('Error fetching priority distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch priority distribution',
      message: error.message
    });
  }
});

// GET phase distribution
router.get('/phase-distribution', async (req, res) => {
  try {
    const totalReq = supabase.from('projects').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase.from('projects').select('current_phase');
    if (error) throw error;
    const totalRes = await totalReq;
    const total = totalRes.count || 0;

    const phaseStats = countBy(data || [], 'current_phase').map((r) => ({
      current_phase: r.current_phase,
      count: r.count,
      percentage: total ? Math.round((r.count * 1000) / total) / 10 : 0
    }));

    res.json({ success: true, data: phaseStats });
  } catch (error) {
    console.error('Error fetching phase distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phase distribution',
      message: error.message
    });
  }
});

// GET projects by end month
router.get('/by-end-month', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('end_month, status, status2, priority');
    if (error) throw error;

    const map = new Map();
    (data || []).forEach((p) => {
      const key = p.end_month || '';
      const entry = map.get(key) || {
        end_month: key,
        total_projects: 0,
        active_projects: 0,
        high_priority_projects: 0,
        in_development_projects: 0,
        completed_projects: 0
      };
      entry.total_projects += 1;
      if (p.status === 'Active') entry.active_projects += 1;
      if (p.priority === 'High') entry.high_priority_projects += 1;
      if (p.status2 === 'In Development') entry.in_development_projects += 1;
      if (p.status2 === 'Done') entry.completed_projects += 1;
      map.set(key, entry);
    });

    const monthlyProjects = Array.from(map.values()).sort((a, b) => String(a.end_month).localeCompare(String(b.end_month)));

    res.json({ success: true, data: monthlyProjects });
  } catch (error) {
    console.error('Error fetching projects by end month:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects by end month',
      message: error.message
    });
  }
});

// GET simple projects summary
router.get('/simple-summary', async (req, res) => {
  try {
    const totalReq = supabase.from('simple_projects').select('id', { count: 'exact', head: true });
    const activeReq = supabase.from('simple_projects').select('id', { count: 'exact', head: true }).eq('status', 'Active');
    const delayedReq = supabase.from('simple_projects').select('id', { count: 'exact', head: true }).eq('status', 'Delayed');
    const completedReq = supabase.from('simple_projects').select('id', { count: 'exact', head: true }).eq('status', 'Completed');

    const [totalRes, activeRes, delayedRes, completedRes] = await Promise.all([totalReq, activeReq, delayedReq, completedReq]);

    res.json({
      success: true,
      data: {
        totalProjects: totalRes.count || 0,
        activeProjects: activeRes.count || 0,
        delayedProjects: delayedRes.count || 0,
        completedProjects: completedRes.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching simple projects summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch simple projects summary',
      message: error.message
    });
  }
});

module.exports = router; 