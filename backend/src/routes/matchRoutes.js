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

const router = express.Router();

router.route('/')
  .get(getMatches)
  .post(createMatch);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getMatchById)
  .patch(updateMatch)
  .delete(deleteMatch);

router.route('/:id/status')
  .all(validateObjectId('id'))
  .patch(updateMatchStatus);

router.route('/:id/goals')
  .all(validateObjectId('id'))
  .post(recordGoal);

export default router;
