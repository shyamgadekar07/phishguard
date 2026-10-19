import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import templateRoutes from './routes/template.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import simulationRoutes from './routes/simulation.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Security & Parsing Middlewares
app.use(cors({
  origin: '*', // Permissive for Phase 1/2/3 development; restricted in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
