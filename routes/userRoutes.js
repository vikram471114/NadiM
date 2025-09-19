import express from 'express';
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protect all routes after this middleware
// Only authenticated users can access user management routes
router.use(protect);

// Restrict all subsequent routes to Admins and Managers only
router.use(restrictTo('Admin', 'Manager'));

router.route('/')
  .get(getAllUsers)   // Get all users
  .post(createUser);  // Create new user

router.route('/:id')
  .get(getUser)       // Get single user
  .patch(updateUser)  // Update user partially
  .delete(deleteUser); // Hard delete user

export default router;
