let app;
let initError = null;

try {
  app = require('../server/index.js');
} catch (err) {
  initError = err;
  console.error('Failed to load server:', err);
}

// Vercel serverless handler
const handler = async (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server failed to load', details: initError.message, stack: initError.stack }));
    return;
  }

  try {
    const db = require('../server/db.js');
    if (db._isAsync) {
      await db.initDb();
    }
    app(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Handler error', details: err.message, stack: err.stack }));
  }
};

module.exports = handler;

// Disable Vercel's default body parsing so multer can handle multipart uploads
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
