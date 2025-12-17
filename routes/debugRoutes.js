const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Debug-only endpoint to check if incoming request has auth cookie or header
// Enabled conditionally from server.js when DEBUG_API env var is truthy.
router.get('/auth-check', (req, res) => {
  try {
    const cookieToken = req.cookies?.token;
    const headerToken = req.headers.authorization && req.headers.authorization.split(' ')[1];
    const token = cookieToken || headerToken;

    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.jwt || 'dev_jwt_secret_change_me');
      } catch (err) {
        decoded = { error: err.message };
      }
    }

    res.json({
      success: true,
      cookies: !!cookieToken,
      header: !!headerToken,
      tokenFound: !!token,
      decoded: decoded,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
