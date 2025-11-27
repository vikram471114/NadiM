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
// ✅ دالة التنظيف (Auth Sanitizer)
// ============================================================
const prepareSafeParticipant = (userDoc) => {
  // 1. تحويل مستند المونجو إلى كائن JS عادي (مهم جداً لكسر قيود المونجو)
  // نستخدم متغير جديد لضمان عدم التعديل على المستند الأصلي بشكل خاطئ
  let user = userDoc.toObject ? userDoc.toObject() : userDoc;

  // 2. إنشاء مشارك وهمي إذا لم يوجد
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      __v: 0
    };
  }
  
  const p = user.participant;
  const now = new Date().toISOString();

  // ---------------------------------------------------
  // حقن البيانات الشامل (تغطية كل الثغرات)
  // ---------------------------------------------------
  
  // تحويل IDs لنصوص
  p.id = (p._id || "000000000000000000000000").toString();
  
  // النصوص
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.username = p.username || user.username || 'user';
  
  // الاتصال
  p.phone = p.phone || '';
  p.mobile = p.mobile || '';
  p.email = p.email || ''; 

  // الموقع
  p.region = p.region || '';
  p.city = p.city || '';
  p.address = p.address || '';
  
  // الوسائط
  p.image = p.image || '';
  p.avatar = p.avatar || '';

  // الأرقام والمنطق
  p.gender = p.gender || 'male';
  p.age = p.age || 20;
  p.birthDate = p.birthDate || now;
  p.balance = p.balance || 0;
  p.points = p.points || 0;
  p.isVerified = true;
  p.isActive = true;
  p.status = 'active';
  
  // التواريخ
  p.createdAt = p.createdAt || now;
  p.updatedAt = p.updatedAt || now;

  // حفظ التعديلات
  user.participant = p;

  // نسخ الإيميل للجذر
  if (!user.email) user.email = p.email || '';

  // 🛑 أهم نقطة: إرجاع الكائن المعدل
  return user;
};

// ============================================================
// LOGIN
// ============================================================
const createAndSendToken = (userDoc, statusCode, res) => {
  const token = signToken(userDoc._id);

  // 🛑 التعديل المصحح هنا: يجب استقبال القيمة المرجعة
  // نقوم بتنظيف المستخدم وحفظ النسخة النظيفة في متغير
  const safeUser = prepareSafeParticipant(userDoc);
  
  // إزالة كلمة المرور من النسخة النظيفة
  safeUser.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: safeUser, // ✅ نرسل النسخة النظيفة (safeUser) وليس الأصلية
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

// ============================================================
// LOGOUT
// ============================================================
export const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج بنجاح' });
};

// ============================================================
// GET ME
// ============================================================
export const getMe = catchAsync(async (req, res, next) => {
  const currentUserDoc = await User.findById(req.user.id).populate('participant');

  if (!currentUserDoc) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }

  // 🛑 التعديل المصحح هنا أيضاً
  const safeUser = prepareSafeParticipant(currentUserDoc);
   
  res.status(200).json({
    status: 'success',
    data: {
      user: safeUser, // ✅ نرسل النسخة النظيفة
    },
  });
});
