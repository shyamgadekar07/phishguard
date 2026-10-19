import express from 'express';
import {
  getAnalyticsOverview,
  getTraineesRisk,
  getUserRiskAnalytics,
  getMyRiskAnalytics,
  recalculateRisk,
} from '../controllers/analytics.controller.js';
import { protect, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// Self-risk analytics: Trainees can access their own behavioral risk data
router.get('/me/risk', getMyRiskAnalytics);

// Administrative analytics routes: Restricted to ADMIN & SECURITY_OFFICER
router.get('/overview', authorizeRoles('ADMIN', 'SECURITY_OFFICER'), getAnalyticsOverview);
router.get('/users', authorizeRoles('ADMIN', 'SECURITY_OFFICER'), getTraineesRisk);
router.get('/users/:userId/risk', authorizeRoles('ADMIN', 'SECURITY_OFFICER'), getUserRiskAnalytics);
router.post('/users/:userId/recalculate', authorizeRoles('ADMIN', 'SECURITY_OFFICER'), recalculateRisk);

export default router;
