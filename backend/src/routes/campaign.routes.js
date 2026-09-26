import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignMetrics,
} from '../controllers/campaign.controller.js';
import { protect, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All campaign operations require ADMIN or SECURITY_OFFICER role
router.use(protect);
router.use(authorizeRoles('ADMIN', 'SECURITY_OFFICER'));

router.route('/')
  .post(createCampaign)
  .get(getCampaigns);

router.route('/:id')
  .get(getCampaignById)
  .put(updateCampaign)
  .delete(deleteCampaign);

router.route('/:id/metrics')
  .get(getCampaignMetrics);

export default router;
