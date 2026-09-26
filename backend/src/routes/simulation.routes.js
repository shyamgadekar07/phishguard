import express from 'express';
import {
  handleSimulationClick,
  handleSimulationReport,
} from '../controllers/simulation.controller.js';

const router = express.Router();

/**
 * Public Simulation Awareness Endpoints
 * (Safe educational landing pages - Zero credential harvesting)
 */
router.get('/:trackingId', handleSimulationClick);
router.post('/:trackingId/report', handleSimulationReport);

export default router;
