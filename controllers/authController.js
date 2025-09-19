import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) Check if username and password exist
  if (!username || !password) {
    return next(new AppError('يرجى تقديم اسم المستخدم وكلمة المرور', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ username: username.toLowerCase() })
    .select('+password')
    .populate('participant'); // <-- Using the virtual populate we created!

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401));
  }

  // 3) If everything is ok, send token to client
  createAndSendToken(user, 200, res);
});

// For JWT, logout is handled on the client-side by deleting the token.
// This server route is just to acknowledge the action.
export const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج بنجاح' });
};

// This function will be used by a middleware to get the currently logged-in user
export const getMe = catchAsync(async (req, res, next) => {
  // We assume that a previous middleware has put the user id on req.user
  const currentUser = await User.findById(req.user.id).populate('participant');

  if (!currentUser) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser,
    },
  });
});
