import express from 'express';
import {
  getAllTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  processTeamLogo,
  setLeagueIdForFilter,
  setLeagueIdOnBody,
} from '../controllers/teamController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { uploadLogo } from '../middlewares/uploadMiddleware.js';

// The { mergeParams: true } option allows this router to access URL parameters
// from its parent router (e.g., :leagueId from the league router).
const router = express.Router({ mergeParams: true });

// Protect all routes in this file. Everyone must be logged in.
router.use(protect);

router.route('/')
  // This route handles both GET /api/teams and GET /api/leagues/:leagueId/teams
  .get(setLeagueIdForFilter, getAllTeams)
  // This route handles both POST /api/teams and POST /api/leagues/:leagueId/teams
  .post(
    restrictTo('Admin', 'Manager'),
    uploadLogo,
    processTeamLogo,
    setLeagueIdOnBody,
    createTeam
  );

router.route('/:id')
  .get(getTeam)
  .patch(
    restrictTo('Admin', 'Manager'),
    uploadLogo,
    processTeamLogo,
    updateTeam
  )
  .delete(restrictTo('Admin', 'Manager'), deleteTeam);

export default router;
