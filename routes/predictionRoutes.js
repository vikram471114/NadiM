import express from 'express';
import {
  createOrUpdatePrediction,
  getMatchPredictions,
  getMyPredictions,
  getLeaderboard,
  getUserPredictionDetails, // <-- Import the new function
} from '../controllers/predictionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { checkIfPredictionAllowed } from '../middlewares/predictionMiddleware.js';

const router = express.Router();

// All routes in this file require the user to be logged in.
router.use(protect);

// --- Public Routes (for all logged-in users) ---
router.get('/leaderboard', getLeaderboard);

// --- Predictor-Specific Routes ---
router.get('/my-predictions', getMyPredictions);
// Note: We use the new details route for the results page now
router.get('/my-details', getUserPredictionDetails); 
router.post(
  '/',
  restrictTo('Predictor'),
  checkIfPredictionAllowed,
  createOrUpdatePrediction
);

// --- Admin/Manager-Specific Routes ---
router.get('/match/:matchId', restrictTo('Admin', 'Manager'), getMatchPredictions);

// ** NEW ROUTE ADDED HERE **
// This route allows an admin to get the detailed report for ANY user.
router.get('/details/:userId', restrictTo('Admin', 'Manager'), getUserPredictionDetails);

export default router;

