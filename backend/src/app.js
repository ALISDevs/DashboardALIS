import cors from 'cors';
import express from 'express';
import clientRoutes from './routes/clientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import projectRoutes from './routes/projectRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

const app = express();
const allowedOrigins = [process.env.TICKETS_ALIS_ORIGIN, process.env.DASHBOARD_ALIS_ORIGIN].filter(Boolean);
app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origen no permitido.');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-ALIS-Request']
}));
app.use(express.json({ limit: '512kb' }));
app.use('/api', (req, res, next) => {
  req.body ??= {};
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    (!allowedOrigins.includes(req.get('Origin')) || req.get('X-ALIS-Request') !== '1')) {
    return res.status(403).json({ message: 'No se pudo verificar el origen de la solicitud.' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
