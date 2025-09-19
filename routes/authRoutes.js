import express from 'express';
import { login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route: Anyone can try to log in
router.post('/login', login);

// Protected routes: Only logged-in users can access these
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
