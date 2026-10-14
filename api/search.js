// Vercel Function: same response as GET /api/search in backend/server.js
const { searchAll } = require('../backend/search');

module.exports = async (req, res) => {
  // Vercel sets x-forwarded-for to the real client IP (first entry); used for the per-visitor search limit.
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  const { status, body } = await searchAll(req.query.q, ip);
  res.status(status).json(body);
};
