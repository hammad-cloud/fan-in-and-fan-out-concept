const express = require('express');
const dotenv = require('dotenv');
const { listStores, searchAll } = require('./search');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by'); // don't advertise the framework
// No CORS: in development the frontend reaches this server through Vite's same-origin /api proxy.

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/stores', (req, res) => {
  res.json(listStores());
});

app.get('/api/search', async (req, res) => {
  const { status, body } = await searchAll(req.query.q, req.ip);
  res.status(status).json(body);
});

// Only listen when run directly, so tests can start the app on a free port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
