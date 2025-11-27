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

  // ✅ التعديل السحري هنا: إنشاء كائن مشارك وهمي مكتمل الحقول
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000", // آيدي وهمي بصيغة Mongo
      userId: user._id,
      name: 'غير محدد',
      fullName: 'غير محدد', // مهم للمودل
      phone: '',            // نص فارغ يمنع الكراش (Not Null)
      region: '',           // نص فارغ
      email: '',            // احتياط
      image: ''             // احتياط
    };
  }

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
    .populate('participant'); 

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401));
  }

  // 3) If everything is ok, send token to client
  createAndSendToken(user, 200, res);
});

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

  // ✅ التعديل السحري هنا أيضاً لحماية الـ Auto Login
  if (!currentUser.participant) {
    currentUser.participant = {
      _id: "000000000000000000000000",
      userId: currentUser._id,
      name: 'غير محدد',
      fullName: 'غير محدد',
      phone: '',  // القيم الفارغة هي مفتاح الحل
      region: '',
      email: '',
      image: ''
    };
  }
   
  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser,
    },
  });
});
