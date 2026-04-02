const app = require('../server/index.js');

// Vercel serverless handler
const handler = (req, res) => {
  const db = require('../server/db.js');
  if (db._isAsync) {
    db.initDb()
      .then(() => app(req, res))
      .catch((err) => {
        console.error('DB init error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
  } else {
    app(req, res);
  }
};

module.exports = handler;

// Disable Vercel's default body parsing so multer can handle multipart uploads
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
