// Vercel Function: same response as GET /api/stores in backend/server.js
const { listStores } = require('../backend/search');

module.exports = (req, res) => {
  res.status(200).json(listStores());
};
