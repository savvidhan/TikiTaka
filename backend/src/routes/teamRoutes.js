import express from 'express';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
} from '../controllers/teamController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

router.route('/')
  .get(getTeams)
  .post(createTeam);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getTeamById)
  .patch(updateTeam)
  .delete(deleteTeam);

export default router;
