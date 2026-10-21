import express from 'express';
import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
} from '../controllers/playerController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getPlayers)
  .post(protect, authorize('Admin', 'TeamManager'), createPlayer);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getPlayerById)
  .patch(protect, authorize('Admin', 'TeamManager'), updatePlayer)
  .delete(protect, authorize('Admin', 'TeamManager'), deletePlayer);

export default router;
