// server.js
// Drop-in replacement for your current file

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ---- Supabase connection test (your existing module) ----
const { testConnection } = require('./config/supabase');

// ---- Your existing route handlers ----
const projectsRoutes = require('./routes/projects');
const simpleProjectsRoutes = require('./routes/simpleProjects');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const commentsRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Behind Render’s proxy so rate-limit & IPs work correctly
app.set('trust proxy', 1);

// ---------- Security ----------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// ---------- Body parsers ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- CORS (allow-list via env) ----------


const envOrigins = []
  .concat((process.env.CORS_ORIGINS || '').split(','))
  .concat(process.env.FRONTEND_URL || [])
  .map(s => s && s.trim())
  .filter(Boolean);

// Helpful dev defaults if nothing was provided
const devDefaults = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const ALLOWED_ORIGINS = envOrigins.length ? envOrigins : devDefaults;

const corsOptions = {
  origin(origin, cb) {
    // allow non-browser requests (curl, server-to-server) which send no Origin
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn(`CORS blocked for origin: ${origin}`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Handle preflight cleanly
app.options('*', cors(corsOptions));

// ---------- Rate limiting (API only) ----------
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 15 * 60 * 1000, // 15m
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ---------- Simple request logger ----------
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- Static assets ----------
app.use(express.static(PUBLIC_DIR));

// ---------- Health checks ----------
app.get('/health', async (_req, res) => {
  try {
    const ok = await testConnection();
    res.json({
      status: ok ? 'OK' : 'DB_DISCONNECTED',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      error: err?.message || String(err)
    });
  }
});
app.get('/api/health', async (_req, res) => {
  try {
    const ok = await testConnection();
    res.json({ status: ok ? 'OK' : 'DB_DISCONNECTED' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err?.message || String(err) });
  }
});

// ---------- API routes (mounted BEFORE any SPA fallback) ----------
app.use('/api/projects', projectsRoutes);
app.use('/api/simple-projects', simpleProjectsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/comments', commentsRoutes);

// 404 for unknown API routes (kept before SPA fallback)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ---------- SPA fallback (serves your frontend for non-API GETs) ----------
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  // only handle GETs to avoid swallowing POST/PUT/DELETE by mistake
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ---------- Global error handler ----------
app.use((err, _req, res, _next) => {
  console.error('Global error handler:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: {
      message: err?.message || 'Internal server error',
      status
    }
  });
});

// ---------- Start server ----------
(async function start() {
  try {
    const dbOK = await testConnection();
    if (!dbOK) {
      console.warn('⚠️  Database connection failed. API routes that hit Supabase may not work.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on ${PORT}`);
      console.log(`🔗 API base: /api`);
      console.log(`🌐 Static dir: ${PUBLIC_DIR}`);
      console.log(`✅ CORS allow-list:\n  - ${ALLOWED_ORIGINS.join('\n  - ')}`);
    });
  } catch (e) {
    console.error('❌ Failed to start server:', e);
    process.exit(1);
  }
})();
