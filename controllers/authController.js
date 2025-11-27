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
// ✅ دالة التجهيز الآمن (Auth Helper)
// تضمن وجود كافة الحقول والتواريخ لمنع الـ Crash
// ============================================================
const prepareSafeParticipant = (user) => {
  // 1. إذا لم يكن هناك مشارك، ننشئ هيكلاً فارغاً
  if (!user.participant) {
    user.participant = {
      _id: "000000000000000000000000",
      userId: user._id,
      // تواريخ افتراضية (مهمة جداً للفلاتر)
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0
    };
  }
  
  // 2. ضمان وجود كل الحقول كنصوص فارغة بدلاً من null
  const p = user.participant;
  
  p.name = p.name || 'غير محدد';
  p.fullName = p.fullName || p.name || 'غير محدد';
  p.phone = p.phone || '';
  p.region = p.region || '';
  
  // حقول إضافية تسبب المشاكل
  p.email = p.email || '';
  p.image = p.image || '';
  p.avatar = p.avatar || '';
  p.city = p.city || '';
  p.address = p.address || '';
  
  // 3. التأكد من وجود التواريخ (حتى لو المشارك موجود سابقاً)
  p.createdAt = p.createdAt || new Date().toISOString();
  p.updatedAt = p.updatedAt || new Date().toISOString();
  
  user.participant = p;
  return user;
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // إخفاء كلمة المرور
  user.password = undefined;
  
  // ✅ تطبيق التنظيف قبل الإرسال
  prepareSafeParticipant(user);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------
export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) التحقق من المدخلات
  if (!username || !password) {
    return next(new AppError('يرجى تقديم اسم المستخدم وكلمة المرور', 400));
  }

  // 2) البحث عن المستخدم وجلب المشارك
  const user = await User.findOne({ username: username.toLowerCase() })
    .select('+password')
    .populate('participant');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('اسم المستخدم أو كلمة المرور غير صحيحة', 401));
  }

  // 3) إرسال التوكن مع البيانات الآمنة
  createAndSendToken(user, 200, res);
});

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
export const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'تم تسجيل الخروج بنجاح' });
};

// ------------------------------------------------------------
// GET ME (للتحقق من الجلسة عند فتح التطبيق)
// ------------------------------------------------------------
export const getMe = catchAsync(async (req, res, next) => {
  // المستخدم قادم من Middleware المصادقة السابق
  const currentUser = await User.findById(req.user.id).populate('participant');

  if (!currentUser) {
    return next(new AppError('المستخدم غير موجود.', 404));
  }

  // ✅ تطبيق التنظيف هنا أيضاً ضروري جداً
  prepareSafeParticipant(currentUser);
   
  res.status(200).json({
    status: 'success',
    data: {
      user: currentUser,
    },
  });
});
