require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { parseAndValidate, dedupeEdges } = require('../src/parser');
const { buildForest } = require('../src/forest');
const { buildSummary } = require('../src/summary');

const IDENTITY = {
  user_id: 'devanshsingh_24042026',
  email_id: 'devansh.singh20045@gmail.com',
  college_roll_number: 'RA2311027010014',
};

function parseInput(data) {
  const { validEdges, invalidEntries } = parseAndValidate(data);
  const { dedupedEdges, duplicateEdges } = dedupeEdges(validEdges);
  return {
    validEdges: dedupedEdges,
    invalidEntries,
    duplicateEdges,
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());

const corsOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const allowAnyOrigin = corsOrigins.includes('*') && !isProduction;
const strictAllowedOrigins = corsOrigins.filter((origin) => origin !== '*');

if (isProduction && corsOrigins.includes('*')) {
  // eslint-disable-next-line no-console
  console.error('[CORS] ALLOWED_ORIGINS="*" is unsafe in production; wildcard disabled.');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/Postman/server-to-server).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowAnyOrigin || strictAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
};
app.use(cors(corsOptions));

app.use(compression());

app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function patchedEnd(...args) {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    }

    return originalEnd.apply(this, args);
  };

  next();
});

app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});
app.use('/bfhl', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/bfhl', (req, res) => {
  res.status(200).json(IDENTITY);
});

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    if (data === undefined) {
      return res.status(400).json({ error: 'Missing required field: data' });
    }
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Field 'data' must be an array" });
    }
    if (data.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 entries allowed' });
    }

    const sanitized = data.map((entry) =>
      (typeof entry === 'string' ? entry.slice(0, 20) : '')
    );

    const { validEdges, invalidEntries, duplicateEdges } = parseInput(sanitized);
    const { hierarchies } = buildForest(validEdges);
    const summary = buildSummary(hierarchies);

    return res.status(200).json({
      ...IDENTITY,
      hierarchies,
      invalid_entries: invalidEntries,
      duplicate_edges: duplicateEdges,
      summary,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[POST /bfhl]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  if (err && err.message === 'CORS origin not allowed') {
    return res.status(403).json({ error: 'CORS origin not allowed' });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // eslint-disable-next-line no-console
  console.error('[Unhandled error]', err);
  return res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
  process.exit(1);
});

if (require.main === module) {
  app.listen(PORT);
}

module.exports = {
  app,
  IDENTITY,
  parseInput,
};
