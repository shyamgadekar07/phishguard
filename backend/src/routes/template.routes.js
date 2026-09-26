import express from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '../controllers/template.controller.js';
import { protect, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All template management endpoints are restricted to ADMIN and SECURITY_OFFICER
router.use(protect);
router.use(authorizeRoles('ADMIN', 'SECURITY_OFFICER'));

router.route('/')
  .post(createTemplate)
  .get(getTemplates);

router.route('/:id')
  .get(getTemplateById)
  .put(updateTemplate)
  .delete(deleteTemplate);

export default router;
