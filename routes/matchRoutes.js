import express from 'express';
import {
  getAllMatches,
  getOpenMatches,
  createMatch,
  getMatch,
  updateMatch,
  enterResult,
  deleteMatch,
  deleteManyMatches, // <<<--- 1. أضفنا استيراد الدالة الجديدة
} from '../controllers/matchController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes in this file require the user to be logged in.
router.use(protect);

// A special route for predictors to see only the matches open for prediction.
router.get('/open', getOpenMatches);

// Route for entering a match result. Only Admins and Managers can do this.
router.patch('/:id/result', restrictTo('Admin', 'Manager'), enterResult);

// Standard CRUD routes for matches
router.route('/')
  // All logged-in users can get the list of all matches
  .get(getAllMatches)
  // Only Admins and Managers can create a new match
  .post(restrictTo('Admin', 'Manager'), createMatch)
  // <<<--- 2. أضفنا مسار الحذف المتعدد هنا
  .delete(restrictTo('Admin', 'Manager'), deleteManyMatches);

router.route('/:id')
  // All logged-in users can view a single match's details
  .get(getMatch)
  // Only Admins and Managers can update a match
  .patch(restrictTo('Admin', 'Manager'), updateMatch)
  // Only Admins and Managers can delete (soft delete) a single match
  .delete(restrictTo('Admin', 'Manager'), deleteMatch);

export default router;