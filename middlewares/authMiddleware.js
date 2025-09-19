import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

// Middleware to protect routes that require authentication
export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('أنت غير مسجل الدخول. يرجى تسجيل الدخول للوصول.', 401));
  }

  // 2) Verification of the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('المستخدم الذي ينتمي إليه هذا التوكن لم يعد موجودًا.', 401));
  }
  
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// Middleware to restrict access based on user roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['Admin', 'Manager']. req.user.role is 'Predictor'
    if (!roles.includes(req.user.role)) {
      return next(new AppError('ليس لديك الصلاحية للقيام بهذا الإجراء.', 403));
    }
    next();
  };
};
