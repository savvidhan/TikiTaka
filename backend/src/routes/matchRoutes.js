import express from 'express';
import {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  updateMatchStatus,
  recordGoal,
  deleteMatch
} from '../controllers/matchController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { protect, authorize, authorizeMatchStatus } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getMatches)
  .post(protect, authorize('Admin', 'TeamManager'), createMatch);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getMatchById)
  .patch(protect, authorize('Admin', 'TeamManager'), updateMatch)
  .delete(protect, authorize('Admin', 'TeamManager'), deleteMatch);

router.route('/:id/status')
  .all(validateObjectId('id'))
  .patch(protect, authorizeMatchStatus, updateMatchStatus);

router.route('/:id/goals')
  .all(validateObjectId('id'))
  .post(protect, authorize('Admin', 'Referee'), recordGoal);

export default router;
