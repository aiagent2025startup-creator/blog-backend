require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import routes
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const llmRoutes = require('./routes/llmRoutes');
const profileRoutes = require('./routes/profileRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const followSuggestionRoutes = require('./routes/followSuggestionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middleware
// Allow configuring CORS via CORS_ORIGIN or FRONTEND_URL (fallback to localhost 8080)
// Support comma-separated values so multiple frontend origins can be allowed.
// CORS_ORIGIN may be a comma-separated list. Normalize by trimming and removing trailing slashes.
// Combine env vars and hardcoded values to ensure we never lock ourselves out
const envOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '').split(',');
const defaultOrigins = ['http://localhost:8080', 'https://blog-frontned-9v3r.vercel.app', 'https://chronicle-flow.vercel.app'];
const allOrigins = [...envOrigins, ...defaultOrigins];
const ALLOWED_ORIGINS = [...new Set(allOrigins.map(s => s.trim().replace(/\/$/, '')).filter(Boolean))];

// Use a dynamic origin checker to avoid subtle mismatches (e.g., trailing slash).
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g., curl, server-to-server) which send no origin
    if (!origin) return callback(null, true);
    const sanitized = origin.replace(/\/$/, '');
    if (ALLOWED_ORIGINS.includes(sanitized)) return callback(null, true);
    console.warn(`Blocked CORS request from origin: ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// NOTE: previous code used a static `CORS_ALLOWED_ORIGINS` variable which is
// now replaced by `ALLOWED_ORIGINS` and a dynamic origin checker above.
// The following static cors() call was removed to avoid a ReferenceError when
// older env vars exist or the variable is not defined.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Real-time event broadcast system
const eventEmitter = new (require('events').EventEmitter)();
const clients = new Set(); // Track connected SSE clients

// Broadcast event to all connected clients
function broadcastEvent(eventType, data) {
  const eventData = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };

  // Send to all connected SSE clients
  clients.forEach((clientResponse) => {
    try {
      clientResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error.message);
      clients.delete(clientResponse);
    }
  });

  console.log(`📡 Broadcasting event: ${eventType}`);
}

// Make broadcastEvent globally available
global.broadcastEvent = broadcastEvent;

// Optional public realtime endpoint URL (e.g., deployed URL on Render/Vercel)
// Set REALTIME_PUBLIC_URL to your deployed API (for example: https://blog-backend-e4j1.onrender.com)
const REALTIME_PUBLIC_URL = process.env.REALTIME_PUBLIC_URL || process.env.PUBLIC_API_URL || '';

// MongoDB Connection
// Prefer `MONGODB_URI` (common name) but accept `MONGO_URI` for compatibility
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/fb';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);

    // Helpful troubleshooting hints for common connectivity issues
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('⚠️  Connection refused to MongoDB. Possible causes:');
      console.error('   - `MONGODB_URI` (or `MONGO_URI`) not set in environment');
      console.error('   - Trying to connect to localhost in a deployed environment (use a hosted MongoDB URI)');
      console.error('   - MongoDB server not reachable due to network/firewall or IP access list');
    }
    if (err.name === 'MongooseServerSelectionError') {
      console.error('🔎 Tip: Verify your MongoDB connection string, cluster host, and that the cluster allows incoming connections from your deployment environment.');
    }
    // If this is a production-like environment, exit so Render shows a failing deployment.
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') process.exit(1);
  });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/follow-suggestions', followSuggestionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);

// Optional debug routes (only enabled in non-production or when DEBUG_API=true)
if (process.env.DEBUG_API === 'true' || process.env.NODE_ENV !== 'production') {
  try {
    const debugRoutes = require('./routes/debugRoutes');
    app.use('/api/debug', debugRoutes);
    console.log('Debug routes enabled at /api/debug/*');
  } catch (err) {
    console.warn('Debug routes could not be loaded:', err.message);
  }
}

// Real-time SSE endpoint
app.get('/api/events/stream', (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // For SSE connections we must echo back the request's origin when it's allowed.
  // For SSE connections we must echo back the request's origin when it's allowed.
  const reqOrigin = (req.headers.origin || '').replace(/\/$/, '');

  // Check if origin is allowed
  if (ALLOWED_ORIGINS.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    // If not in the strict list, check if it matches the known frontend URL directly
    // This is a fallback fix for the reported issue where env vars might be missing the new URL
    const knownFrontend = 'https://blog-frontned-9v3r.vercel.app';
    if (reqOrigin === knownFrontend) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    } else {
      // Fallback to first allowed origin or '*' if none (though credentials mode disallows *)
      // We use the first allowed origin as a safe default if available, otherwise the request origin itself if we want to be permissive (risky)
      // or just fail. Here we try to be safe but avoid crashing if ALLOWED_ORIGINS is empty.
      const defaultOrigin = ALLOWED_ORIGINS[0] || 'http://localhost:8080';
      res.setHeader('Access-Control-Allow-Origin', defaultOrigin);
    }
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', data: { message: 'Connected to real-time events' }, timestamp: new Date().toISOString() })}\n\n`);

  // Add client to set
  clients.add(res);
  console.log(`✅ Client connected. Total clients: ${clients.size}`);

  // Send heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    console.log(`❌ Client disconnected. Total clients: ${clients.size}`);
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// Basic route
app.get('/', (req, res) => {
  const local = `http://localhost:${process.env.PORT || 5000}/api/events/stream`;
  const publicUrl = REALTIME_PUBLIC_URL ? `${REALTIME_PUBLIC_URL.replace(/\/$/, '')}/api/events/stream` : null;
  res.json({ message: 'Server is running', realtimeClients: clients.size, events: { local, public: publicUrl } });
});

// Quick top-level ping for debugging
app.get('/__debug/ping', (req, res) => res.json({ success: true, msg: 'pong' }));

// DEV: quick endpoint to test email delivery without creating a user
if (process.env.NODE_ENV === 'development') {
  const emailService = require('./services/emailService');
  app.get('/__debug/send-test-email', async (req, res) => {
    const to = (req.query.to || process.env.GMAIL_USER);
    if (!to) return res.status(400).json({ success: false, message: 'Provide ?to=email to send test or set GMAIL_USER in .env' });
    try {
      await emailService.sendRegistrationEmail(to, 'DevTester');
      res.json({ success: true, message: `Test email sent to ${to}` });
    } catch (err) {
      console.error('Test email failed:', err);
      res.status(500).json({ success: false, message: 'Failed to send test email', error: err.message });
    }
  });
}

// Debug route to inspect masked env values (enabled in dev or when ALLOW_DEBUG=true)
const ALLOW_DEBUG = process.env.ALLOW_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
if (ALLOW_DEBUG) {
  // Helper to mask sensitive parts of a MongoDB URI for safe debug display
  function maskMongoURI(uri) {
    if (!uri || typeof uri !== 'string') return '(none)';
    try {
      // Replace credentials and long query params
      return uri.replace(/:\/\/.*@/, '://***:***@').replace(/([?&]authSource=[^&]*)/i, '***').slice(0, 120) + (uri.length > 120 ? '...' : '');
    } catch (e) {
      return '(masked)';
    }
  }
  app.get('/__debug/env', (req, res) => {
    try {
      const maskedMongo = maskMongoURI(mongoURI || process.env.MONGODB_URI || process.env.MONGO_URI || '(none)');
      const mailConfigured = !!(process.env.GMAIL_USER && process.env.GMAIL_PASSWORD);
      res.json({
        nodeEnv: process.env.NODE_ENV || 'not-set',
        mongoHost: maskedMongo,
        mailConfigured,
        allowedCorsOrigins: ALLOWED_ORIGINS,
        realtimePublicUrl: REALTIME_PUBLIC_URL || null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read environment', message: err.message });
    }
  });

  // Quick test endpoint to validate mask helper
  app.get('/__debug/mask-test', (req, res) => {
    try {
      const sample = 'mongodb://user:pass@cluster.example.net/dbname?authSource=admin';
      res.json({ sample, masked: maskMongoURI(sample) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Log allowed origins on startup for easier debugging
console.log('Allowed CORS origins:', ALLOWED_ORIGINS.join(', '));

// Health check route
app.get('/health', (req, res) => {
  // Include DB connection status for easier health monitoring
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbState = (mongoose && mongoose.connection && mongoose.connection.readyState) || 0;
  res.json({ status: 'OK', realtimeClients: clients.size, db: dbStateMap[dbState] || 'unknown' });
});

// Global error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON received:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: err.message,
    });
  }

  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error',
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS allowed origin(s): ${ALLOWED_ORIGINS.join(', ')}`);
  const localEvents = `http://localhost:${PORT}/api/events/stream`;
  if (REALTIME_PUBLIC_URL) {
    // Trim trailing slash if present
    const publicEvents = `${REALTIME_PUBLIC_URL.replace(/\/$/, '')}/api/events/stream`;
    console.log(`📡 Real-time events endpoints: ${localEvents}  ${publicEvents}`);
  } else {
    console.log(`📡 Real-time events endpoint: ${localEvents}`);
  }
});

module.exports = app;
