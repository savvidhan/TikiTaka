import express from 'express';
import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
} from '../controllers/playerController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

router.route('/')
  .get(getPlayers)
  .post(createPlayer);

router.route('/:id')
  .all(validateObjectId('id'))
  .get(getPlayerById)
  .patch(updatePlayer)
  .delete(deletePlayer);

export default router;
