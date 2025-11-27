import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// ============================================================
// ✅ دالة التنظيف (Auth Sanitizer + Image Fix)
// ============================================================
const prepareSafeParticipant = (userDoc) => {
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }
  
  const p = user.participant;
  const now = new Date().toISOString();
  
  // رابط صورة افتراضي (يمنع كراش NetworkImage)
  const defaultImg = "https://placehold.co/400x400/png"; 

  // أ. تعبئة المشارك
  p.id = (p._id || "000000000000000000000000").toString();
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.username = p.username || user.username || 'user';
  
  p.phone = p.phone || '';
  p.mobile = p.mobile || '';
  p.email = p.email || ''; 

  p.region = p.region || '';
  p.city = p.city || '';
  p.address = p.address || '';
  
  // 🛑 إصلاح الصور (وضع رابط افتراضي بدلاً من الفراغ)
  p.image = (p.image && p.image.length > 5) ? p.image : defaultImg;
  p.avatar = (p.avatar && p.avatar.length > 5) ? p.avatar : defaultImg;
  p.photo = p.image;

  p.gender = p.gender || 'male';
  p.age = p.age || 20;
  p.birthDate = p.birthDate || now;
  
  p.balance = p.balance || 0.0;
  p.points = p.points || 0.0;
  
  p.isVerified = true;
  p.isActive = true;
  p.status = 'active';
  
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;

  user.participant = p;

  // ب. النسخ للجذر (Root Injection)
  user.id = user._id.toString();
  user.fullName = p.fullName;
  user.name = p.fullName;
  
  user.phone = p.phone;
  user.mobile = p.phone;
  
  // نسخ الصور للجذر أيضاً
  user.image = p.image;
  user.photo = p.image;
  user.avatar = p.image;
  
  user.region = p.region;
  user.email = user.email || p.email || '';

  return user;
};

const createAndSendToken = (userDoc, statusCode, res) => {
  const token = signToken(userDoc._id);

  // نستخدم المتغير الجديد للحفظ
  const safeUser = prepareSafeParticipant(userDoc);
  safeUser.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: safeUser,
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
  const currentUserDoc = await User.findById(req.user.id).populate('participant');

  if (!currentUserDoc) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }

  const safeUser = prepareSafeParticipant(currentUserDoc);
   
  res.status(200).json({
    status: 'success',
    data: {
      user: safeUser,
    },
  });
});
