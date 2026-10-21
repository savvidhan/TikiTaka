import express from 'express';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
} from '../controllers/teamController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getTeams)
  .post(protect, authorize('Admin', 'TeamManager'), createTeam);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getTeamById)
  .patch(protect, authorize('Admin', 'TeamManager'), updateTeam)
  .delete(protect, authorize('Admin', 'TeamManager'), deleteTeam);

export default router;
