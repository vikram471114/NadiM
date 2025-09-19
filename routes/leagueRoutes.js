import teamRouter from './teamRoutes.js';
import express from 'express';
import {
  getAllLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  processLeagueLogo,
} from '../controllers/leagueController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { uploadLogo } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use('/:leagueId/teams', teamRouter);

// All routes in this file are protected and require the user to be logged in.
router.use(protect);

router.route('/')
  // Anyone logged in can get the list of leagues (Predictors, Managers, Admins)
  .get(getAllLeagues)
  // Only Admins and Managers can create a new league
  .post(
    restrictTo('Admin', 'Manager'),
    uploadLogo,
    processLeagueLogo,
    createLeague
  );

router.route('/:id')
  // Anyone logged in can view a single league and its teams
  .get(getLeague)
  // Only Admins and Managers can update a league
  .patch(
    restrictTo('Admin', 'Manager'),
    uploadLogo,
    processLeagueLogo,
    updateLeague
  )
  // Only Admins and Managers can delete (soft delete) a league
  .delete(restrictTo('Admin', 'Manager'), deleteLeague);

export default router;
