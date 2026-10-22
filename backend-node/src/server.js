import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { initDb } from './db.js';
import { seedUsers } from './seed.js';
import { startScheduler } from './scheduler.js';
import { authRouter } from './routes/auth.js';
import { candidatesRouter } from './routes/candidates.js';
import { consentRouter } from './routes/consent.js';
import { probesRouter } from './routes/probes.js';
import { codingRouter } from './routes/coding.js';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
const allowedOrigins = [
  config.frontendOrigin,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl) or in allowed list
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local development demo
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for authentication & public consent endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Register API routers
app.use('/api/auth', authRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/consent', consentRouter);
app.use('/api/probes', probesRouter);
app.use('/api/coding', codingRouter);
app.use('/coding', codingRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ProofPath API',
    status: 'operational',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: 'sqlite (sql.js / Wasm)', status: 'operational' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[ProofPath Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ detail: err.message || 'Internal server error' });
});

// Startup sequence
async function startServer() {
  await initDb();
  await seedUsers();
  startScheduler();

  const server = app.listen(config.port, () => {
    console.log(`======================================================`);
    console.log(`ProofPath Node.js API operational on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/api/health`);
    console.log(`Frontend URL: ${config.frontendOrigin}`);
    console.log(`======================================================`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export { app, startServer };
