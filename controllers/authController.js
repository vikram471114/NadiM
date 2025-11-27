import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// دالة مساعدة لتجهيز المشارك الوهمي الكامل
const prepareSafeParticipant = (user) => {
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
    };
  }
  
  // ضمان وجود الحقول كنصوص فارغة لمنع الكراش
  const p = user.participant;
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.phone = p.phone || '';
  p.region = p.region || '';
  p.email = p.email || '';
  p.image = p.image || '';
  p.avatar = p.avatar || '';
  p.city = p.city || '';
  
  user.participant = p;
  return user;
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  user.password = undefined;
  
  // ✅ استخدام الدالة الآمنة هنا
  prepareSafeParticipant(user);

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

  if (!username || !password) {
    return next(new AppError('يرجى تقديم اسم المستخدم وكلمة المرور', 400));
  }

  const user = await User.findOne({ username: username.toLowerCase() })
    .select('+password')
    .populate('participant');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401));
  }

  createAndSendToken(user, 200, res);
});

export const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج بنجاح' });
};

export const getMe = catchAsync(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id).populate('participant');

  if (!currentUser) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }

  // ✅ استخدام الدالة الآمنة هنا أيضاً (مهم جداً عند إعادة فتح التطبيق)
  prepareSafeParticipant(currentUser);
   
  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser,
    },
  });
});
